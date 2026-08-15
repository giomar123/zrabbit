import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("texto del formulario Yape", () => {
  it("nombra el código de compra sin exponer el término técnico OTP", () => {
    const component = readFileSync(new URL("../client/src/components/MercadoPagoPaymentBrick.tsx", import.meta.url), "utf8");
    expect(component).toContain("Código de compra Yape");
    expect(component).toContain("código de compra de 6 dígitos");
    expect(component).not.toContain("Código OTP de Yape");
  });
});
