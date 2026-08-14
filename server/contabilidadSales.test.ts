import { describe, expect, it } from "vitest";
import { contabilidadSaleReference, isContabilidadSalesConfigured } from "./contabilidadSales";

describe("registro de ventas hacia contabilidad", () => {
  it("genera una referencia diferente y estable para cada artículo del pedido", () => {
    expect(contabilidadSaleReference("FC-ABCD-1234", 18)).toBe("FC-ABCD-1234:ITEM-18");
    expect(contabilidadSaleReference("FC-ABCD-1234", 19)).not.toBe(contabilidadSaleReference("FC-ABCD-1234", 18));
  });

  it("solo considera configurado el registro cuando existen ambas credenciales técnicas", () => {
    const username = process.env.CONTABILIDAD_SALES_USERNAME;
    const password = process.env.CONTABILIDAD_SALES_PASSWORD;
    delete process.env.CONTABILIDAD_SALES_USERNAME; delete process.env.CONTABILIDAD_SALES_PASSWORD;
    expect(isContabilidadSalesConfigured()).toBe(false);
    process.env.CONTABILIDAD_SALES_USERNAME = "ventas@example.com";
    process.env.CONTABILIDAD_SALES_PASSWORD = "segura";
    expect(isContabilidadSalesConfigured()).toBe(true);
    if (username === undefined) delete process.env.CONTABILIDAD_SALES_USERNAME; else process.env.CONTABILIDAD_SALES_USERNAME = username;
    if (password === undefined) delete process.env.CONTABILIDAD_SALES_PASSWORD; else process.env.CONTABILIDAD_SALES_PASSWORD = password;
  });
});
