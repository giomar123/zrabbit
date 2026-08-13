import { describe, expect, it } from "vitest";
import { verifyMercadoPagoAccess } from "./mercadoPago";

describe("credenciales de Mercado Pago", () => {
  it("valida el Access Token mediante el endpoint ligero de medios de pago", async () => {
    expect(process.env.VITE_MERCADOPAGO_PUBLIC_KEY).toBeTruthy();
    const result = await verifyMercadoPagoAccess();
    expect(result.paymentMethods).toBeGreaterThan(0);
  }, 15_000);
});
