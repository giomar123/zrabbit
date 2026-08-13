import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyMercadoPagoWebhookSignature } from "./mercadoPago";

const originalSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
afterEach(() => { if (originalSecret === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET; else process.env.MERCADOPAGO_WEBHOOK_SECRET = originalSecret; vi.unstubAllEnvs(); });

describe("firma del webhook Mercado Pago", () => {
  it("acepta solo la firma HMAC que corresponde al pago y solicitud", () => {
    const secret = "webhook-test-secret"; const dataId = "998877"; const requestId = "request-123"; const ts = "1704908010";
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", secret);
    const signature = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
    expect(verifyMercadoPagoWebhookSignature({ signature: `ts=${ts},v1=${signature}`, requestId, dataId })).toBe(true);
    const altered = `${signature[0] === "0" ? "1" : "0"}${signature.slice(1)}`;
    expect(verifyMercadoPagoWebhookSignature({ signature: `ts=${ts},v1=${altered}`, requestId, dataId })).toBe(false);
  });
});
