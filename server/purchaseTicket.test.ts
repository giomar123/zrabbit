import { afterEach, describe, expect, it, vi } from "vitest";
import { createPurchaseTicketPdf, purchaseTicketInternals } from "./purchaseTicket";

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

describe("ticket de compra", () => {
  it("desglosa un precio final en subtotal e IGV incluido sin alterar el total", () => {
    const totals = purchaseTicketInternals.calculateTicketBreakdown(20_003);
    expect(totals.subtotalInCents + totals.igvInCents).toBe(20_003);
    expect(totals.subtotalInCents).toBe(Math.round(20_003 / 1.18));
    expect(totals.igvInCents).toBe(20_003 - totals.subtotalInCents);
  });

  it("incluye líneas, envío y una referencia neutral a Términos en el ticket HTML", () => {
    const html = purchaseTicketInternals.buildPurchaseTicketHtml({ orderNumber: "ZR-0001", customerName: "Cliente", customerEmail: "cliente@example.com", shippingMethod: "shalom", isFreeShipping: true, totalInCents: 9_900, items: [{ productName: "Figura <especial>", quantity: 1, unitPriceInCents: 9_900, subtotalInCents: 9_900 }] });
    expect(html).toContain("IGV (18%) incluido");
    expect(html).toContain("Envío gratis por Shalom");
    expect(html).toContain("Figura &lt;especial&gt;");
    expect(html).toContain("Términos y Condiciones de zRabbit");
    expect(html).not.toContain("No sustituye un comprobante");
  });

  it("genera un PDF válido aunque el logo remoto no esté disponible", async () => {
    global.fetch = vi.fn(async () => new Response("", { status: 404 })) as typeof fetch;
    const pdf = await createPurchaseTicketPdf({ orderNumber: "ZR-0002", customerName: "Cliente", customerEmail: "cliente@example.com", shippingMethod: "shalom", isFreeShipping: false, totalInCents: 9_900, items: [{ productName: "Figura", quantity: 1, unitPriceInCents: 9_900, subtotalInCents: 9_900 }] });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
