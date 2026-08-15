import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { categories, orderItems, orders, paymentEvents, products } from "../drizzle/schema";
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
    const category = (await db.select().from(categories).limit(1))[0];
    if (!category) throw new Error("Se requiere una categoría para la prueba.");
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const sku = `SYNC-${suffix}`;
    const created = await db.insert(products).values({ categoryId: category.id, name: "Producto temporal de sincronización", slug: `producto-temporal-${suffix}`, sku, shortDescription: "Producto temporal para aislar la prueba de ventas.", priceInCents: MINIMUM_ORDER_IN_CENTS, stock: 1, status: "active" });
    const productId = Number(created[0].insertId);
    const product = (await db.select().from(products).where(eq(products.id, productId)).limit(1))[0];
    if (!product?.sku) throw new Error("No se creó el producto temporal de prueba.");
    const quantity = 1;
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
      await db.delete(products).where(eq(products.id, product.id));
    }
  });
});
