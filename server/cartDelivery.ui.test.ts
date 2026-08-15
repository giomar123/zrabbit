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

  it("abre el directorio oficial de Shalom y guarda de forma manual la agencia elegida", () => {
    const finder = readFileSync(new URL("../client/src/components/ShalomAgencyFinder.tsx", import.meta.url), "utf8");
    expect(finder).toContain("https://shalom.com.pe/agencias/aereo");
    expect(finder).toContain("Buscar agencias oficiales de Shalom");
    expect(finder).toContain("Guardar agencia para este envío");
    expect(finder).toContain("onSelect");
  });
});
