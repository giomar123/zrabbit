import type express from "express";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { orders, paymentEvents } from "../drizzle/schema";
import { getDb } from "./db";
import { notifyPaymentApproved } from "./orderNotifications";
import { syncApprovedOrderToContabilidad } from "./contabilidadSales";

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

type MercadoPagoApiError = Error & { mercadoPagoStatus?: number; mercadoPagoCode?: string; mercadoPagoCause?: string };

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }
  throw lastError;
}

function fingerprint(value: string | undefined) {
  return value ? createHash("sha256").update(value).digest("hex").slice(0, 12) : null;
}

export function getMercadoPagoSafeTrace(input: { cardToken?: string; clientPublicKeyPrefix?: string; clientPublicKeyFingerprint?: string }) {
  const configuredPublicKey = process.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  const configuredAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  return {
    cardToken: { present: Boolean(input.cardToken), fingerprint: fingerprint(input.cardToken) },
    clientPublicKey: { prefix: input.clientPublicKeyPrefix?.slice(0, 12) ?? null, fingerprint: input.clientPublicKeyFingerprint ?? null },
    serverPublicKey: { configured: Boolean(configuredPublicKey), prefix: configuredPublicKey?.slice(0, 12) ?? null, fingerprint: fingerprint(configuredPublicKey) },
    accessToken: { configured: Boolean(configuredAccessToken), prefix: configuredAccessToken?.slice(0, 12) ?? null, fingerprint: fingerprint(configuredAccessToken) },
  };
}

async function mercadoFetch(path: string, init: RequestInit = {}) {
  const response = await fetchWithRetry(`https://api.mercadopago.com${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken()}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Mercado Pago no pudo procesar el pago (${response.status}).`) as MercadoPagoApiError;
    error.mercadoPagoStatus = response.status;
    error.mercadoPagoCode = typeof (body as { error?: unknown }).error === "string" ? (body as { error: string }).error : undefined;
    error.mercadoPagoCause = typeof (body as { message?: unknown }).message === "string" ? (body as { message: string }).message : undefined;
    console.warn("[Mercado Pago payment]", { status: error.mercadoPagoStatus, code: error.mercadoPagoCode ?? "unknown", cause: error.mercadoPagoCause ?? "unknown" });
    throw error;
  }
  return body as MercadoPayment;
}

export async function verifyMercadoPagoAccess(): Promise<{ paymentMethods: number }> {
  const response = await fetchWithRetry("https://api.mercadopago.com/v1/payment_methods", { headers: { Authorization: `Bearer ${accessToken()}` } });
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

export async function createMercadoPagoPayment(input: { orderId: number; token: string; paymentMethodId: string; issuerId?: string; installments: number; payerEmail: string; identificationType?: string; identificationNumber?: string; clientPublicKeyPrefix?: string; clientPublicKeyFingerprint?: string }) {
  const db = await getDb(); if (!db) throw new Error("La base de datos no está disponible.");
  const order = (await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
  if (!order) throw new Error("El pedido no existe.");
  if (order.status === "paid") throw new Error("Este pedido ya fue pagado.");
  const payer = { email: input.payerEmail, ...(input.identificationType && input.identificationNumber ? { identification: { type: input.identificationType, number: input.identificationNumber } } : {}) };
  const idempotencyKey = createHash("sha256").update(`${order.orderNumber}:${input.token}`).digest("hex");
  let payment: MercadoPayment;
  try {
    payment = await mercadoFetch("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ transaction_amount: order.totalInCents / 100, token: input.token, description: `zRabbit · ${order.orderNumber}`, installments: input.installments, payment_method_id: input.paymentMethodId, ...(input.issuerId ? { issuer_id: input.issuerId } : {}), payer, external_reference: order.orderNumber }),
    });
  }
  catch (error) { console.warn("[Mercado Pago credential trace]", getMercadoPagoSafeTrace({ cardToken: input.token, clientPublicKeyPrefix: input.clientPublicKeyPrefix, clientPublicKeyFingerprint: input.clientPublicKeyFingerprint })); throw error; }
  const status = toStoreStatus(payment.status);
  await db.update(orders).set({ status, mercadoPagoPaymentId: payment.id ? String(payment.id) : null, mercadoPagoStatus: payment.status ?? null }).where(eq(orders.id, order.id));
  if (status === "paid") {
    await notifyPaymentApproved({ orderNumber: order.orderNumber, totalInCents: order.totalInCents, paymentId: payment.id ? String(payment.id) : null });
    await syncApprovedOrderToContabilidad(order.id);
  }
  return { orderNumber: order.orderNumber, paymentId: payment.id ? String(payment.id) : null, status, mercadoPagoStatus: payment.status ?? "pending", detail: payment.status_detail ?? null };
}

export async function syncMercadoPagoPayment(paymentId: string) {
  const db = await getDb(); if (!db) throw new Error("La base de datos no está disponible.");
  const payment = await mercadoFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
  if (!payment.external_reference) return { synchronized: false, reason: "missing_external_reference", providerStatus: payment.status ?? null };
  const order = (await db.select().from(orders).where(eq(orders.orderNumber, payment.external_reference)).limit(1))[0];
  if (!order || Math.round((payment.transaction_amount ?? 0) * 100) !== order.totalInCents) return { synchronized: false, reason: "order_not_found_or_amount_mismatch", providerStatus: payment.status ?? null };
  const status = toStoreStatus(payment.status);
  await db.update(orders).set({ status, mercadoPagoPaymentId: payment.id ? String(payment.id) : paymentId, mercadoPagoStatus: payment.status ?? null }).where(eq(orders.id, order.id));
  if (status === "paid") {
    if (order.status !== "paid") await notifyPaymentApproved({ orderNumber: order.orderNumber, totalInCents: order.totalInCents, paymentId: payment.id ? String(payment.id) : paymentId });
    await syncApprovedOrderToContabilidad(order.id);
  }
  return { synchronized: true, status, orderId: order.id, providerStatus: payment.status ?? null };
}

export function registerMercadoPagoWebhook(app: express.Express) {
  app.post("/api/mercado-pago/webhook", async (req, res) => {
    const paymentId = String(req.body?.data?.id ?? req.query["data.id"] ?? "");
    const requestId = req.get("x-request-id") ?? undefined;
    const valid = verifyMercadoPagoWebhookSignature({ signature: req.get("x-signature") ?? undefined, requestId, dataId: paymentId || undefined });
    const db = await getDb();
    const record = async (values: { orderId?: number; signatureValid: boolean; providerStatus?: string | null; result: string; reason?: string; }) => {
      if (!db) return;
      await db.insert(paymentEvents).values({ orderId: values.orderId ?? null, providerPaymentId: paymentId || null, eventType: String(req.body?.type ?? req.query.type ?? "payment").slice(0, 80), signatureValid: values.signatureValid, providerStatus: values.providerStatus ?? null, result: values.result, reason: values.reason?.slice(0, 240) ?? null, requestId: requestId?.slice(0, 180) ?? null });
    };
    if (!valid) { await record({ signatureValid: false, result: "rejected", reason: "invalid_signature" }); return res.status(401).json({ received: false }); }
    if (!paymentId) { await record({ signatureValid: true, result: "ignored", reason: "missing_payment_id" }); return res.status(200).json({ received: true }); }
    try { const sync = await syncMercadoPagoPayment(paymentId); await record({ orderId: sync.orderId, signatureValid: true, providerStatus: sync.providerStatus, result: sync.synchronized ? "synchronized" : "ignored", reason: sync.reason }); return res.status(200).json({ received: true }); }
    catch (error) { console.error("[Mercado Pago webhook]", error); await record({ signatureValid: true, result: "error", reason: "sync_failed" }); return res.status(500).json({ received: false }); }
  });
}
