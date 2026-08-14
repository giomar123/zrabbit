import { eq, inArray } from "drizzle-orm";
import { orderItems, orders, paymentEvents, products } from "../drizzle/schema";
import { getDb } from "./db";

const SOURCE_URL = "https://contabilidad.zrabbit.shop";
type SourceProduct = { id: number; code: string };
type SourceInventory = { productCode: string; finalStock: number | string };
type SaleResult = { id?: number; idempotent?: boolean };

export function isContabilidadSalesConfigured() {
  return Boolean(process.env.CONTABILIDAD_SALES_USERNAME && process.env.CONTABILIDAD_SALES_PASSWORD);
}

export function contabilidadSaleReference(orderNumber: string, orderItemId: number) {
  return `${orderNumber}:ITEM-${orderItemId}`;
}

function endpoint(procedure: string) {
  return `${SOURCE_URL}/api/trpc/${procedure}?batch=1`;
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await fetch(url, init); }
    catch (error) { lastError = error; await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1))); }
  }
  throw lastError;
}

function extractCookie(response: Response) {
  const all = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const first = all[0] ?? response.headers.get("set-cookie") ?? "";
  const cookie = first.split(";")[0];
  if (!cookie) throw new Error("Contabilidad no devolvió una sesión de Ventas.");
  return cookie;
}

async function login() {
  const email = process.env.CONTABILIDAD_SALES_USERNAME;
  const password = process.env.CONTABILIDAD_SALES_PASSWORD;
  if (!email || !password) throw new Error("La cuenta técnica de Ventas no está configurada.");
  const response = await fetchWithRetry(endpoint("auth.login"), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ "0": { json: { email, password } } }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || JSON.stringify(payload).includes("error")) throw new Error("Contabilidad rechazó la cuenta técnica de Ventas.");
  return extractCookie(response);
}

async function sourceRead<T>(cookie: string, procedure: string): Promise<T> {
  const response = await fetchWithRetry(endpoint(procedure), { headers: { Cookie: cookie } });
  const payload = await response.json().catch(() => null) as Array<{ result?: { data?: { json?: T } } }> | null;
  const value = payload?.[0]?.result?.data?.json;
  if (!response.ok || value === undefined) throw new Error(`Contabilidad no permitió leer ${procedure}.`);
  return value;
}

async function sourceCreateSale(cookie: string, input: Record<string, unknown>): Promise<SaleResult> {
  const response = await fetchWithRetry(endpoint("sales.create"), {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ "0": { json: input } }),
  });
  const payload = await response.json().catch(() => null) as Array<{ result?: { data?: { json?: SaleResult } }; error?: unknown }> | null;
  const value = payload?.[0]?.result?.data?.json;
  if (!response.ok || !value || payload?.[0]?.error) throw new Error("Contabilidad no pudo registrar la venta.");
  return value;
}

async function recordSyncEvent(orderId: number, paymentId: string | null, result: "synchronized" | "failed" | "skipped", reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(paymentEvents).values({ orderId, providerPaymentId: paymentId, eventType: "contabilidad_sale", signatureValid: true, providerStatus: result, result, reason: reason.slice(0, 240) });
}

export async function syncApprovedOrderToContabilidad(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!order || order.status !== "paid") return { status: "skipped" as const, reason: "order_not_paid" };
  if (!isContabilidadSalesConfigured()) return { status: "skipped" as const, reason: "sales_account_not_configured" };

  try {
    const [items, catalog, cookie] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
      db.select().from(products),
      login(),
    ]);
    const sourceProducts = await sourceRead<SourceProduct[]>(cookie, "products.list");
    const localById = new Map(catalog.map(product => [product.id, product]));
    let created = 0; let deduplicated = 0; let skipped = 0;

    for (const item of items) {
      const local = localById.get(item.productId);
      if (!local?.sku) { skipped += 1; continue; }
      const source = sourceProducts.find(product => product.code.trim().toUpperCase() === local.sku!.trim().toUpperCase());
      if (!source) throw new Error(`No se encontró el código ${local.sku} en contabilidad.`);
      const result = await sourceCreateSale(cookie, {
        saleDate: new Date().toISOString().slice(0, 10), productId: source.id, quantity: item.quantity,
        unitPrice: (item.unitPriceInCents / 100).toFixed(2), currency: "PEN",
        buyerName: order.customerName, buyerEmail: order.customerEmail, buyerPhone: order.customerPhone ?? undefined,
        externalReference: contabilidadSaleReference(order.orderNumber, item.id),
      });
      if (result.idempotent) deduplicated += 1; else created += 1;
    }

    const inventory = await sourceRead<SourceInventory[]>(cookie, "inventory.list");
    const stockBySku = new Map(inventory.map(row => [row.productCode.trim().toUpperCase(), Math.max(0, Math.trunc(Number(row.finalStock) || 0))]));
    const localWithSku = catalog.filter(product => product.sku && stockBySku.has(product.sku.trim().toUpperCase()));
    await Promise.all(localWithSku.map(product => db.update(products).set({ stock: stockBySku.get(product.sku!.trim().toUpperCase())! }).where(eq(products.id, product.id))));
    const reason = `ventas=${created}; duplicadas=${deduplicated}; sin_sku=${skipped}`;
    await recordSyncEvent(order.id, order.mercadoPagoPaymentId, "synchronized", reason);
    return { status: "synchronized" as const, created, deduplicated, skipped };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "No se pudo registrar la venta en contabilidad.";
    await recordSyncEvent(order.id, order.mercadoPagoPaymentId, "failed", reason);
    console.error("[Contabilidad sales sync]", { orderId, reason });
    return { status: "failed" as const, reason };
  }
}
