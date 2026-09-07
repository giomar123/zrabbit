import { and, eq } from "drizzle-orm";
import { products, stockNotifications } from "../drizzle/schema";
import { getDb } from "./db";

type RestockSubscriber = { id: number; email: string };
type RestockProduct = { id: number; name: string; slug: string; priceInCents: number };

function htmlEscape(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function productUrl(slug: string) {
  const origin = (process.env.CANONICAL_ORIGIN || "https://zrabbit.shop").replace(/\/$/, "");
  return `${origin}/productos/${encodeURIComponent(slug)}`;
}

function restockEmail(product: RestockProduct) {
  const url = productUrl(product.slug);
  const name = htmlEscape(product.name);
  const price = `S/ ${(product.priceInCents / 100).toFixed(2)}`;
  return {
    subject: `¡${product.name} volvió a estar disponible en zRabbit!`,
    html: `<main style="font-family:Arial,sans-serif;color:#142235;line-height:1.5"><h1 style="margin:0 0 16px">¡Tu figura ya está disponible!</h1><p><strong>${name}</strong> volvió a tener stock en zRabbit.</p><p>Precio actual: <strong>${price}</strong>.</p><p><a href="${htmlEscape(url)}" style="display:inline-block;background:#142235;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">Ver producto</a></p><p style="color:#5b6573;font-size:13px">Recibiste este aviso porque solicitaste ser notificado para este producto. La disponibilidad puede cambiar.</p></main>`,
    text: `¡Tu figura ya está disponible!\n\n${product.name} volvió a tener stock en zRabbit.\nPrecio actual: ${price}.\n\nVer producto: ${url}\n\nRecibiste este aviso porque solicitaste ser notificado para este producto. La disponibilidad puede cambiar.`,
  };
}

function emailConfiguration() {
  const sender = process.env.RESEND_FROM_EMAIL?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!sender || !apiKey) return null;
  return { apiKey, from: sender.includes("<") ? sender : `zRabbit <${sender}>` };
}

async function sendRestockEmail(email: string, subscriberId: number, product: RestockProduct) {
  if (process.env.VITEST) return { sent: false as const, reason: "test_environment" as const };
  const config = emailConfiguration();
  if (!config) return { sent: false as const, reason: "missing_configuration" as const };
  const message = restockEmail(product);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `restock-${product.id}-${subscriberId}`,
      },
      body: JSON.stringify({ from: config.from, to: [email], subject: message.subject, html: message.html, text: message.text }),
    });
    if (!response.ok) {
      console.error("[Restock notification] Resend rechazó el envío", { status: response.status, subscriberId, productId: product.id });
      return { sent: false as const, reason: "provider_rejected" as const };
    }
    return { sent: true as const };
  } catch (error) {
    console.error("[Restock notification] No se pudo enviar el correo", { subscriberId, productId: product.id, error });
    return { sent: false as const, reason: "request_failed" as const };
  }
}

export async function notifyRestockSubscribers(product: RestockProduct) {
  const db = await getDb();
  if (!db) return { sentCount: 0, pendingCount: 0 };
  const subscribers = await db.select({ id: stockNotifications.id, email: stockNotifications.email })
    .from(stockNotifications)
    .where(and(eq(stockNotifications.productId, product.id), eq(stockNotifications.status, "pending")));
  let sentCount = 0;
  for (const subscriber of subscribers satisfies RestockSubscriber[]) {
    const result = await sendRestockEmail(subscriber.email, subscriber.id, product);
    if (result.sent) {
      await db.update(stockNotifications).set({ status: "sent", notifiedAt: new Date() }).where(eq(stockNotifications.id, subscriber.id));
      sentCount += 1;
    }
  }
  return { sentCount, pendingCount: subscribers.length - sentCount };
}

export async function subscribeToRestock(productId: number, email: string) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const [product] = await db.select({ id: products.id, name: products.name, stock: products.stock, status: products.status })
    .from(products).where(eq(products.id, productId)).limit(1);
  if (!product || product.status !== "active") throw new Error("El producto ya no está disponible para recibir avisos.");
  if (product.stock > 0) throw new Error("Este producto ya tiene stock. Puedes añadirlo al carrito.");
  const normalizedEmail = email.trim().toLowerCase();
  await db.insert(stockNotifications).values({ productId, email: normalizedEmail, status: "pending", notifiedAt: null })
    .onDuplicateKeyUpdate({ set: { status: "pending", notifiedAt: null } });
  return { success: true as const, productName: product.name };
}

export const restockNotificationInternals = { htmlEscape, productUrl, restockEmail, emailConfiguration };
