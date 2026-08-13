import { describe, expect, it } from "vitest";
import { validateOrderQuantity } from "./catalog";

describe("reglas de catálogo para pedidos", () => {
  const product = { name: "Golden Frieza", stock: 2, status: "active" };

  it("acepta una cantidad disponible de un producto publicado", () => {
    expect(() => validateOrderQuantity(product, 2)).not.toThrow();
  });

  it("impide crear pedidos con stock insuficiente", () => {
    expect(() => validateOrderQuantity(product, 3)).toThrow("Stock insuficiente para Golden Frieza.");
  });

  it("impide pedir productos no publicados o cantidades inválidas", () => {
    expect(() => validateOrderQuantity({ ...product, status: "draft" }, 1)).toThrow("Golden Frieza no está disponible.");
    expect(() => validateOrderQuantity(product, 0)).toThrow("La cantidad solicitada no es válida.");
  });
});
