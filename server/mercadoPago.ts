import type express from "express";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { orders } from "../drizzle/schema";
import { getDb } from "./db";

type StoreOrderStatus = "awaiting_payment" | "paid" | "cancelled";
type MercadoPayment = { id?: string | number; status?: string; status_detail?: string; external_reference?: string; transaction_amount?: number };

function accessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago no está configurado.");
  return token;
}

function toStoreStatus(status: string | undefined): StoreOrderStatus {
  if (status === "approved") return "paid";
  if (["rejected", "cancelled", "charged_back", "refunded"].includes(status ?? "")) return "cancelled";
  return "awaiting_payment";
}

async function mercadoFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken()}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Mercado Pago no pudo procesar el pago (${response.status}).`);
  return body as MercadoPayment;
}

export async function verifyMercadoPagoAccess(): Promise<{ paymentMethods: number }> {
  const response = await fetch("https://api.mercadopago.com/v1/payment_methods", { headers: { Authorization: `Bearer ${accessToken()}` } });
  if (!response.ok) throw new Error(`Mercado Pago rechazó las credenciales (${response.status}).`);
  const methods = await response.json() as unknown[];
  return { paymentMethods: methods.length };
}

export function isMercadoPagoWebhookConfigured() { return Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET); }

export function verifyMercadoPagoWebhookSignature(input: { signature?: string; requestId?: string; dataId?: string }) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !input.signature || !input.requestId || !input.dataId) return false;
  const parts = Object.fromEntries(input.signature.split(",").map(pair => pair.trim().split("=", 2)).filter(([key, value]) => key && value));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = String(parts.v1);
  return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export async function createMercadoPagoPayment(input: { orderId: number; token: string; paymentMethodId: string; issuerId?: string; installments: number; payerEmail: string; identificationType?: string; identificationNumber?: string }) {
  const db = await getDb(); if (!db) throw new Error("La base de datos no está disponible.");
  const order = (await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
  if (!order) throw new Error("El pedido no existe.");
  if (order.status === "paid") throw new Error("Este pedido ya fue pagado.");
  const payer = { email: input.payerEmail, ...(input.identificationType && input.identificationNumber ? { identification: { type: input.identificationType, number: input.identificationNumber } } : {}) };
  const idempotencyKey = createHash("sha256").update(`${order.orderNumber}:${input.token}`).digest("hex");
  const payment = await mercadoFetch("/v1/payments", { method: "POST", headers: { "X-Idempotency-Key": idempotencyKey }, body: JSON.stringify({ transaction_amount: order.totalInCents / 100, token: input.token, description: `zRabbit · ${order.orderNumber}`, installments: input.installments, payment_method_id: input.paymentMethodId, ...(input.issuerId ? { issuer_id: input.issuerId } : {}), payer, external_reference: order.orderNumber }) });
  const status = toStoreStatus(payment.status);
  await db.update(orders).set({ status, mercadoPagoPaymentId: payment.id ? String(payment.id) : null, mercadoPagoStatus: payment.status ?? null }).where(eq(orders.id, order.id));
  return { orderNumber: order.orderNumber, paymentId: payment.id ? String(payment.id) : null, status, mercadoPagoStatus: payment.status ?? "pending", detail: payment.status_detail ?? null };
}

export async function syncMercadoPagoPayment(paymentId: string) {
  const db = await getDb(); if (!db) throw new Error("La base de datos no está disponible.");
  const payment = await mercadoFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
  if (!payment.external_reference) return { synchronized: false };
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, payment.external_reference)).limit(1))[0];
  if (!order || Math.round((payment.transaction_amount ?? 0) * 100) !== order.totalInCents) return { synchronized: false };
  const status = toStoreStatus(payment.status);
  await db.update(orders).set({ status, mercadoPagoPaymentId: payment.id ? String(payment.id) : paymentId, mercadoPagoStatus: payment.status ?? null }).where(eq(orders.id, order.id));
  return { synchronized: true, status };
}

export function registerMercadoPagoWebhook(app: express.Express) {
  app.post("/api/mercado-pago/webhook", async (req, res) => {
    const paymentId = String(req.body?.data?.id ?? req.query["data.id"] ?? "");
    const valid = verifyMercadoPagoWebhookSignature({ signature: req.get("x-signature") ?? undefined, requestId: req.get("x-request-id") ?? undefined, dataId: paymentId || undefined });
    if (!valid) return res.status(401).json({ received: false });
    if (!paymentId) return res.status(200).json({ received: true });
    try { await syncMercadoPagoPayment(paymentId); return res.status(200).json({ received: true }); }
    catch (error) { console.error("[Mercado Pago webhook]", error); return res.status(500).json({ received: false }); }
  });
}
