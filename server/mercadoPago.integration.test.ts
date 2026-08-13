import { createHmac } from "crypto";
import express from "express";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { orderItems, orders, products } from "../drizzle/schema";
import { createPendingOrder } from "./catalog";
import { getDb } from "./db";
import { createMercadoPagoPayment, registerMercadoPagoWebhook } from "./mercadoPago";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const realFetch = global.fetch;
const originalSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
const originalToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

async function createTestOrder() {
  const db = await getDb(); if (!db) throw new Error("Base de datos no disponible para prueba.");
  const product = (await db.select().from(products).where(eq(products.status, "active")).limit(1))[0];
  if (!product) throw new Error("Se requiere un producto activo para probar pagos.");
  const order = await createPendingOrder({ customerName: "Prueba Mercado Pago", customerEmail: "buyer-test@example.com", items: [{ productId: product.id, quantity: 1 }] });
  return { db, order };
}

async function removeTestOrder(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, id: number) {
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  await db.delete(orders).where(eq(orders.id, id));
}

afterEach(() => {
  global.fetch = realFetch;
  if (originalSecret === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET; else process.env.MERCADOPAGO_WEBHOOK_SECRET = originalSecret;
  if (originalToken === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN; else process.env.MERCADOPAGO_ACCESS_TOKEN = originalToken;
});

describe("flujo integrado Mercado Pago", () => {
  it("ejecuta checkout.pay por tRPC con la misma clave idempotente ante un reintento", async () => {
    const { db, order } = await createTestOrder(); const calls: RequestInit[] = [];
    global.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => { calls.push(init ?? {}); return new Response(JSON.stringify({ id: 223344, status: "in_process", status_detail: "pending_contingency" }), { status: 201, headers: { "Content-Type": "application/json" } }); }) as typeof fetch;
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {}, get: () => "localhost" } as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const payload = { orderId: order.id, token: "test-payment-token-repeat", paymentMethodId: "visa", installments: 1, payerEmail: "buyer-test@example.com" };
    try {
      await caller.checkout.pay(payload); await caller.checkout.pay(payload);
      expect(calls).toHaveLength(2);
      const firstKey = (calls[0]?.headers as Record<string, string>)["X-Idempotency-Key"];
      const secondKey = (calls[1]?.headers as Record<string, string>)["X-Idempotency-Key"];
      expect(firstKey).toMatch(/^[a-f0-9]{64}$/); expect(secondKey).toBe(firstKey);
    } finally { await removeTestOrder(db, order.id); }
  });

  it("crea un pago idempotente y persiste su estado aprobado", async () => {
    const { db, order } = await createTestOrder(); const calls: RequestInit[] = [];
    global.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => { calls.push(init ?? {}); return new Response(JSON.stringify({ id: 123456, status: "approved", status_detail: "accredited" }), { status: 201, headers: { "Content-Type": "application/json" } }); }) as typeof fetch;
    try {
      const result = await createMercadoPagoPayment({ orderId: order.id, token: "test-payment-token-123456", paymentMethodId: "visa", installments: 1, payerEmail: "buyer-test@example.com" });
      expect(result.status).toBe("paid"); expect(result.paymentId).toBe("123456");
      expect((calls[0]?.headers as Record<string, string>)["X-Idempotency-Key"]).toMatch(/^[a-f0-9]{64}$/);
      const stored = (await db.select().from(orders).where(eq(orders.id, order.id)).limit(1))[0];
      expect(stored?.status).toBe("paid"); expect(stored?.mercadoPagoPaymentId).toBe("123456");
    } finally { await removeTestOrder(db, order.id); }
  });

  it("rechaza webhook sin firma y sincroniza uno firmado", async () => {
    const { db, order } = await createTestOrder(); const secret = "webhook-test-secret"; process.env.MERCADOPAGO_WEBHOOK_SECRET = secret;
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ id: 778899, status: "approved", external_reference: order.orderNumber, transaction_amount: order.totalInCents / 100 }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;
    const app = express(); app.use(express.json()); registerMercadoPagoWebhook(app);
    const server = await new Promise<ReturnType<typeof app.listen>>(resolve => { const instance = app.listen(0, () => resolve(instance)); });
    const address = server.address(); const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`; const dataId = "778899"; const requestId = "signed-request"; const ts = "1704908010";
    const signature = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
    try {
      expect((await realFetch(`${base}/api/mercado-pago/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { id: dataId } }) })).status).toBe(401);
      expect((await realFetch(`${base}/api/mercado-pago/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-request-id": requestId, "x-signature": `ts=${ts},v1=${signature}` }, body: JSON.stringify({ data: { id: dataId } }) })).status).toBe(200);
      const stored = (await db.select().from(orders).where(eq(orders.id, order.id)).limit(1))[0]; expect(stored?.status).toBe("paid");
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); await removeTestOrder(db, order.id); }
  });
});
