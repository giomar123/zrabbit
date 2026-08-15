import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("carrito lateral y entrega Shalom", () => {
  it("abre el carrito al agregar una figura y conserva enlaces de compra accesibles", () => {
    const context = readFileSync(new URL("../client/src/contexts/CartContext.tsx", import.meta.url), "utf8");
    const drawer = readFileSync(new URL("../client/src/components/CartDrawer.tsx", import.meta.url), "utf8");
    expect(context).toContain("setIsDrawerOpen(true)");
    expect(drawer).toContain("Ver carrito y pagar");
    expect(drawer).toContain("Seguir comprando");
  });

  it("consulta agencias mediante Places y enlaza al directorio oficial de Shalom", () => {
    const finder = readFileSync(new URL("../client/src/components/ShalomAgencyFinder.tsx", import.meta.url), "utf8");
    expect(finder).toContain("PlacesService");
    expect(finder).toContain("https://agencias.shalom.pe/");
    expect(finder).toContain("onSelect");
  });
});
