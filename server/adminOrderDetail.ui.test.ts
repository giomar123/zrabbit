import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("detalle administrativo de pedido", () => {
  it("muestra entrega, agencia, artículos, pago y eventos solo dentro del panel admin", () => {
    const source = readFileSync(new URL("../client/src/pages/Admin.tsx", import.meta.url), "utf8");
    expect(source).toContain("Detalle del pedido");
    expect(source).toContain("shippingAgencyName");
    expect(source).toContain("shippingAgencyAddress");
    expect(source).toContain("Total pagado");
    expect(source).toContain("Registro de eventos");
    expect(source).toContain('isAdmin && tab === "orders"');
  });
});
