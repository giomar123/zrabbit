import { describe, expect, it } from "vitest";
import { FREE_SHIPPING_THRESHOLD_IN_CENTS, MINIMUM_ORDER_IN_CENTS, qualifiesForFreeShipping, validateMinimumOrder, validateOrderQuantity } from "./catalog";

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

  it("requiere un pedido mínimo de S/ 99", () => {
    expect(() => validateMinimumOrder(MINIMUM_ORDER_IN_CENTS - 1)).toThrow("El pedido mínimo es de S/ 99.00.");
    expect(() => validateMinimumOrder(MINIMUM_ORDER_IN_CENTS)).not.toThrow();
  });

  it("permite la excepción únicamente para el producto de prueba Yape", () => {
    expect(() => validateMinimumOrder(1_000, true)).not.toThrow();
    expect(() => validateMinimumOrder(1_000, false)).toThrow("El pedido mínimo es de S/ 99.00.");
  });

  it("define el umbral de envío gratuito desde S/ 199", () => {
    expect(FREE_SHIPPING_THRESHOLD_IN_CENTS).toBe(19_900);
    expect(qualifiesForFreeShipping(FREE_SHIPPING_THRESHOLD_IN_CENTS - 1)).toBe(false);
    expect(qualifiesForFreeShipping(FREE_SHIPPING_THRESHOLD_IN_CENTS)).toBe(true);
  });
});
