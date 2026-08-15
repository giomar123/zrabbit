import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("detalle administrativo de pedido", () => {
  it("muestra entrega, agencia, artículos, pago y eventos solo dentro del panel admin", () => {
    const source = readFileSync(new URL("../client/src/pages/Admin.tsx", import.meta.url), "utf8");
    const drawer = readFileSync(new URL("../client/src/components/AdminOrderDetailDrawer.tsx", import.meta.url), "utf8");
    expect(source).toContain("Ver detalle");
    expect(source).toContain("zrabbit:open-order-detail");
    expect(drawer).toContain("Detalle del pedido");
    expect(drawer).toContain("shippingAgencyName");
    expect(drawer).toContain("shippingAgencyAddress");
    expect(drawer).toContain("Eventos y sincronización");
    expect(source).toContain('isAdmin && tab === "orders"');
  });
});
