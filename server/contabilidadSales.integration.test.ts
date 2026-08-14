import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { orderItems, orders, paymentEvents, products } from "../drizzle/schema";
import { createPendingOrder, MINIMUM_ORDER_IN_CENTS } from "./catalog";
import { syncApprovedOrderToContabilidad } from "./contabilidadSales";
import { getDb } from "./db";

const realFetch = global.fetch;
const originalUsername = process.env.CONTABILIDAD_SALES_USERNAME;
const originalPassword = process.env.CONTABILIDAD_SALES_PASSWORD;

afterEach(() => {
  global.fetch = realFetch;
  if (originalUsername === undefined) delete process.env.CONTABILIDAD_SALES_USERNAME; else process.env.CONTABILIDAD_SALES_USERNAME = originalUsername;
  if (originalPassword === undefined) delete process.env.CONTABILIDAD_SALES_PASSWORD; else process.env.CONTABILIDAD_SALES_PASSWORD = originalPassword;
});

describe("sincronización inmediata de venta aprobada", () => {
  it("envía una referencia por artículo y actualiza el stock recibido desde contabilidad", async () => {
    const db = await getDb(); if (!db) throw new Error("Base de datos no disponible para prueba.");
    const product = (await db.select().from(products).where(eq(products.status, "active")).limit(1))[0];
    if (!product?.sku) throw new Error("Se requiere un producto activo importado con SKU para la prueba.");
    const quantity = Math.max(1, Math.ceil(MINIMUM_ORDER_IN_CENTS / product.priceInCents));
    const originalStock = product.stock;
    if (originalStock < quantity) await db.update(products).set({ stock: quantity }).where(eq(products.id, product.id));
    const order = await createPendingOrder({ customerName: "Prueba venta", customerEmail: "ventas-test@example.com", items: [{ productId: product.id, quantity }] });
    await db.update(orders).set({ status: "paid", mercadoPagoPaymentId: "sync-test-payment" }).where(eq(orders.id, order.id));
    process.env.CONTABILIDAD_SALES_USERNAME = "ventas-test@example.com";
    process.env.CONTABILIDAD_SALES_PASSWORD = "no-exponer";
    const calls: Array<{ url: string; body?: string }> = [];
    global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const value = String(url); calls.push({ url: value, body: typeof init?.body === "string" ? init.body : undefined });
      if (value.includes("auth.login")) return new Response(JSON.stringify([{ result: { data: { json: { ok: true } } } }]), { status: 200, headers: { "Content-Type": "application/json", "set-cookie": "session=test; Path=/" } });
      if (value.includes("products.list")) return new Response(JSON.stringify([{ result: { data: { json: [{ id: 987, code: product.sku }] } } }]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (value.includes("sales.create")) return new Response(JSON.stringify([{ result: { data: { json: { id: 654 } } } }]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (value.includes("inventory.list")) return new Response(JSON.stringify([{ result: { data: { json: [{ productCode: product.sku, finalStock: 4 }] } } }]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("{}", { status: 404 });
    }) as typeof fetch;
    try {
      const result = await syncApprovedOrderToContabilidad(order.id);
      expect(result).toMatchObject({ status: "synchronized", created: 1, deduplicated: 0 });
      const saleCall = calls.find(call => call.url.includes("sales.create"));
      expect(saleCall?.body).toContain(order.orderNumber);
      const stored = (await db.select().from(products).where(eq(products.id, product.id)).limit(1))[0];
      expect(stored?.stock).toBe(4);
    } finally {
      await db.delete(paymentEvents).where(eq(paymentEvents.orderId, order.id));
      await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
      await db.delete(orders).where(eq(orders.id, order.id));
      await db.update(products).set({ stock: originalStock }).where(eq(products.id, product.id));
    }
  });
});
