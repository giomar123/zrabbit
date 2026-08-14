import PDFDocument from "pdfkit";

export const IGV_RATE = 0.18;
const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663213950878/aZJLGKwKQZDkdTcS.png";

export type PurchaseTicketItem = { productName: string; quantity: number; unitPriceInCents: number; subtotalInCents: number };
export type PurchaseTicketInput = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  paymentId?: string | null;
  createdAt?: Date | string;
  shippingMethod: string | null;
  isFreeShipping: boolean;
  totalInCents: number;
  items: PurchaseTicketItem[];
};

export function formatPen(valueInCents: number) { return `S/ ${(valueInCents / 100).toFixed(2)}`; }
export function calculateTicketBreakdown(totalInCents: number) {
  const subtotalInCents = Math.round(totalInCents / (1 + IGV_RATE));
  return { subtotalInCents, igvInCents: totalInCents - subtotalInCents, totalInCents };
}
export function ticketShippingLabel(input: Pick<PurchaseTicketInput, "shippingMethod" | "isFreeShipping">) {
  if (input.shippingMethod === "yape_test") return "No aplica · pedido de prueba";
  return input.isFreeShipping ? "S/ 0.00 · Envío gratis por Shalom" : "Por coordinar con Shalom";
}

export function buildPurchaseTicketHtml(input: PurchaseTicketInput) {
  const totals = calculateTicketBreakdown(input.totalInCents);
  const esc = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
  const lines = input.items.map(item => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee">${esc(item.productName)}<br><span style="color:#6b7280;font-size:12px">${item.quantity} × ${formatPen(item.unitPriceInCents)}</span></td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700">${formatPen(item.subtotalInCents)}</td></tr>`).join("");
  return `<main style="max-width:620px;margin:auto;background:#fffaf2;color:#101824;font-family:Arial,sans-serif;line-height:1.45;padding:28px"><header style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #d89542;padding-bottom:18px"><img src="${LOGO_URL}" alt="zRabbit" width="42" height="42" style="object-fit:contain"><div><strong style="font-size:22px">zRabbit</strong><div style="font-size:12px;color:#80501d;letter-spacing:.08em;text-transform:uppercase">Ticket de compra</div></div></header><h1 style="font-size:22px;margin:26px 0 8px">Pago confirmado</h1><p style="margin:0 0 20px;color:#4b5563">Gracias, ${esc(input.customerName)}. Este es el detalle de tu compra <strong>${esc(input.orderNumber)}</strong>.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="text-align:left;border-bottom:2px solid #101824;padding-bottom:8px">Producto</th><th style="text-align:right;border-bottom:2px solid #101824;padding-bottom:8px">Importe</th></tr></thead><tbody>${lines}</tbody></table><section style="margin:22px 0 0 auto;max-width:290px;font-size:14px"><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Subtotal</span><strong>${formatPen(totals.subtotalInCents)}</strong></div><div style="display:flex;justify-content:space-between;padding:5px 0"><span>IGV (18%) incluido</span><strong>${formatPen(totals.igvInCents)}</strong></div><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Envío</span><strong>${esc(ticketShippingLabel(input))}</strong></div><div style="display:flex;justify-content:space-between;border-top:2px solid #101824;margin-top:6px;padding-top:10px;font-size:17px"><strong>Total pagado</strong><strong>${formatPen(totals.totalInCents)}</strong></div></section><p style="margin-top:26px;font-size:12px;color:#6b7280">${input.paymentId ? `Referencia Mercado Pago: ${esc(input.paymentId)}<br>` : ""}Este ticket resume tu compra. No sustituye un comprobante de pago electrónico autorizado por SUNAT.</p></main>`;
}

async function loadLogo() {
  try {
    const response = await fetch(LOGO_URL, { signal: AbortSignal.timeout(3_000) });
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
  } catch { return null; }
}

export async function createPurchaseTicketPdf(input: PurchaseTicketInput): Promise<Buffer> {
  const logo = await loadLogo();
  const totals = calculateTicketBreakdown(input.totalInCents);
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Ticket ${input.orderNumber}`, Author: "zRabbit" } });
  const chunks: Buffer[] = [];
  doc.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  const completed = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  let logoRendered = false;
  if (logo) {
    try { doc.image(logo, 48, 42, { fit: [44, 44] }); logoRendered = true; }
    catch { console.warn("[Purchase ticket] Logo no disponible; se usará marca textual."); }
  }
  doc.fillColor("#101824").font("Helvetica-Bold").fontSize(22).text("zRabbit", logoRendered ? 104 : 48, 48);
  doc.font("Helvetica").fontSize(10).fillColor("#8a5110").text("TICKET DE COMPRA", logoRendered ? 104 : 48, 76);
  doc.moveTo(48, 103).lineTo(547, 103).lineWidth(1.5).strokeColor("#d89542").stroke();
  doc.fillColor("#101824").font("Helvetica-Bold").fontSize(18).text("Pago confirmado", 48, 126);
  doc.font("Helvetica").fontSize(10).fillColor("#4b5563").text(`Pedido: ${input.orderNumber}`, 48, 156).text(`Cliente: ${input.customerName}`, 48, 171).text(`Correo: ${input.customerEmail}`, 48, 186).text(`Fecha: ${new Date(input.createdAt ?? Date.now()).toLocaleString("es-PE")}`, 48, 201);
  let y = 236;
  doc.fillColor("#101824").font("Helvetica-Bold").fontSize(10).text("PRODUCTO", 48, y).text("IMPORTE", 445, y, { width: 102, align: "right" });
  y += 18; doc.moveTo(48, y).lineTo(547, y).lineWidth(0.7).strokeColor("#101824").stroke(); y += 10;
  for (const item of input.items) {
    if (y > 670) { doc.addPage(); y = 58; }
    doc.fillColor("#101824").font("Helvetica-Bold").fontSize(10).text(item.productName, 48, y, { width: 350 });
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563").text(`${item.quantity} × ${formatPen(item.unitPriceInCents)}`, 48, y + 13);
    doc.fillColor("#101824").font("Helvetica-Bold").fontSize(10).text(formatPen(item.subtotalInCents), 445, y + 4, { width: 102, align: "right" });
    y += 34;
  }
  y += 8; doc.moveTo(310, y).lineTo(547, y).lineWidth(0.7).strokeColor("#d9d9d4").stroke(); y += 11;
  const totalLine = (label: string, value: string, bold = false) => { doc.fillColor("#4b5563").font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10).text(label, 310, y).fillColor("#101824").text(value, 445, y, { width: 102, align: "right" }); y += bold ? 22 : 17; };
  totalLine("Subtotal", formatPen(totals.subtotalInCents)); totalLine("IGV (18%) incluido", formatPen(totals.igvInCents)); totalLine("Envío", ticketShippingLabel(input));
  doc.moveTo(310, y).lineTo(547, y).lineWidth(1.2).strokeColor("#101824").stroke(); y += 10; totalLine("TOTAL PAGADO", formatPen(totals.totalInCents), true);
  doc.fillColor("#6b7280").font("Helvetica").fontSize(8).text(input.paymentId ? `Referencia Mercado Pago: ${input.paymentId}` : "", 48, 735).text("Este ticket resume tu compra y no sustituye un comprobante de pago electrónico autorizado por SUNAT.", 48, 748, { width: 499 });
  doc.end(); return completed;
}

export const purchaseTicketInternals = { calculateTicketBreakdown, buildPurchaseTicketHtml, ticketShippingLabel, formatPen };
