type OrderEmailItem = { productName: string; quantity: number };

import { buildPurchaseTicketHtml, createPurchaseTicketPdf, PurchaseTicketInput } from "./purchaseTicket";

type OrderEmailInput = {
  orderNumber: string;
  totalInCents: number;
  shippingMethod: string | null;
  items: OrderEmailItem[];
};

function htmlEscape(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function formatCurrency(totalInCents: number) {
  return `S/ ${(totalInCents / 100).toFixed(2)}`;
}

function emailConfiguration() {
  const sender = process.env.RESEND_FROM_EMAIL?.trim();
  const recipient = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!sender || !recipient || !apiKey) return null;
  return {
    apiKey,
    from: sender.includes("<") ? sender : `zRabbit compras <${sender}>`,
    to: recipient,
  };
}

async function sendOrderEmail(subject: string, html: string, text: string, options?: { to?: string; attachments?: Array<{ filename: string; content: string }>; idempotencyKey?: string }) {
  if (process.env.VITEST) return { sent: false, reason: "test_environment" as const };
  const config = emailConfiguration();
  if (!config) return { sent: false, reason: "missing_configuration" as const };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: config.from, to: [options?.to ?? config.to], subject, html, text, ...(options?.attachments ? { attachments: options.attachments } : {}) }),
    });
    if (!response.ok) {
      console.error("[Order notification] Resend rechazó el envío", { status: response.status });
      return { sent: false, reason: "provider_rejected" as const };
    }
    return { sent: true as const };
  } catch (error) {
    console.error("[Order notification] No se pudo enviar el correo", error);
    return { sent: false, reason: "request_failed" as const };
  }
}

function itemsList(items: OrderEmailItem[]) {
  return items.map(item => `${item.quantity} × ${item.productName}`).join(", ");
}

export async function notifyOrderCreated(input: OrderEmailInput) {
  const shipping = input.shippingMethod === "yape_test" ? "Prueba Yape" : "Shalom";
  const summary = itemsList(input.items);
  const subject = `Nuevo pedido ${input.orderNumber} · ${formatCurrency(input.totalInCents)}`;
  const html = `<main style="font-family:Arial,sans-serif;color:#142235;line-height:1.5"><h1 style="margin:0 0 16px">Nuevo pedido en zRabbit</h1><p><strong>Pedido:</strong> ${htmlEscape(input.orderNumber)}</p><p><strong>Total:</strong> ${formatCurrency(input.totalInCents)}</p><p><strong>Entrega:</strong> ${htmlEscape(shipping)}</p><p><strong>Productos:</strong> ${htmlEscape(summary)}</p><p style="color:#5b6573">El pedido está pendiente de pago. Revísalo en Administración → Pedidos.</p></main>`;
  const text = `Nuevo pedido en zRabbit\nPedido: ${input.orderNumber}\nTotal: ${formatCurrency(input.totalInCents)}\nEntrega: ${shipping}\nProductos: ${summary}\nEstado: pendiente de pago.`;
  return sendOrderEmail(subject, html, text);
}

type PaymentApprovedInput = Pick<OrderEmailInput, "orderNumber" | "totalInCents"> & Partial<Pick<PurchaseTicketInput, "customerName" | "customerEmail" | "shippingMethod" | "isFreeShipping" | "items" | "createdAt">> & { paymentId?: string | null };

export async function notifyPaymentApproved(input: PaymentApprovedInput) {
  const subject = `Pago aprobado ${input.orderNumber} · ${formatCurrency(input.totalInCents)}`;
  const paymentReference = input.paymentId ? `<p><strong>Referencia Mercado Pago:</strong> ${htmlEscape(input.paymentId)}</p>` : "";
  const html = `<main style="font-family:Arial,sans-serif;color:#142235;line-height:1.5"><h1 style="margin:0 0 16px">Pago aprobado en zRabbit</h1><p><strong>Pedido:</strong> ${htmlEscape(input.orderNumber)}</p><p><strong>Total cobrado:</strong> ${formatCurrency(input.totalInCents)}</p>${paymentReference}<p style="color:#5b6573">El pedido ya figura como pagado. Revísalo en Administración → Pedidos.</p></main>`;
  const text = `Pago aprobado en zRabbit\nPedido: ${input.orderNumber}\nTotal cobrado: ${formatCurrency(input.totalInCents)}${input.paymentId ? `\nReferencia Mercado Pago: ${input.paymentId}` : ""}`;
  const admin = await sendOrderEmail(subject, html, text);
  if (!input.customerEmail || !input.customerName || !input.items || input.isFreeShipping === undefined) return { admin, ticket: { sent: false as const, reason: "missing_ticket_data" as const } };
  const ticketInput: PurchaseTicketInput = { orderNumber: input.orderNumber, totalInCents: input.totalInCents, customerName: input.customerName, customerEmail: input.customerEmail, shippingMethod: input.shippingMethod ?? "shalom", isFreeShipping: input.isFreeShipping, items: input.items, paymentId: input.paymentId, createdAt: input.createdAt };
  try {
    const pdf = await createPurchaseTicketPdf(ticketInput);
    const ticketSubject = `Tu ticket de compra ${input.orderNumber} · ${formatCurrency(input.totalInCents)}`;
    const ticketText = `Pago confirmado\nPedido: ${input.orderNumber}\nTotal pagado: ${formatCurrency(input.totalInCents)}\nEl ticket PDF está adjunto.`;
    const ticket = await sendOrderEmail(ticketSubject, buildPurchaseTicketHtml(ticketInput), ticketText, { to: input.customerEmail, attachments: [{ filename: `ticket-${input.orderNumber}.pdf`, content: pdf.toString("base64") }], idempotencyKey: `ticket-${input.orderNumber}-${input.paymentId ?? "approved"}` });
    return { admin, ticket };
  } catch (error) { console.error("[Purchase ticket] No se pudo preparar el ticket", error); return { admin, ticket: { sent: false as const, reason: "ticket_generation_failed" as const } }; }
}

export const orderNotificationInternals = { emailConfiguration, formatCurrency, htmlEscape, itemsList };
