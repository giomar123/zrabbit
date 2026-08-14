import { describe, expect, it } from "vitest";
import { afterEach, expect, it, vi } from "vitest";
import { getMercadoPagoSafeTrace, verifyMercadoPagoAccess } from "./mercadoPago";

describe("credenciales de Mercado Pago", () => {
  it.runIf(process.env.RUN_MERCADOPAGO_CONFIG_TEST === "true")("valida el Access Token mediante el endpoint ligero de medios de pago", async () => {
    expect(process.env.VITE_MERCADOPAGO_PUBLIC_KEY).toBeTruthy();
    const result = await verifyMercadoPagoAccess();
    expect(result.paymentMethods).toBeGreaterThan(0);
  }, 15_000);

  it("registra solo prefijos y huellas no reversibles para diagnosticar credenciales", () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "APP_USR-secret-access-token");
    vi.stubEnv("VITE_MERCADOPAGO_PUBLIC_KEY", "APP_USR-public-key");
    const trace = getMercadoPagoSafeTrace({ cardToken: "card-token-confidencial", clientPublicKeyPrefix: "APP_USR-clien", clientPublicKeyFingerprint: "ab12cd34ef56" });
    expect(trace).toMatchObject({ cardToken: { present: true }, clientPublicKey: { fingerprint: "ab12cd34ef56" }, serverPublicKey: { configured: true }, accessToken: { configured: true } });
    expect(JSON.stringify(trace)).not.toContain("secret-access-token");
    expect(JSON.stringify(trace)).not.toContain("card-token-confidencial");
  });
});
