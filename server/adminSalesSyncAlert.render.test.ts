import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminSalesSyncAlertContent } from "../client/src/components/AdminSalesSyncAlert";
import { summarizeContabilidadSyncAttention } from "../client/src/lib/contabilidadSyncStatus";

describe("AdminSalesSyncAlertContent", () => {
  it("renderiza SKU inexistente, otros errores y pendientes sin doble conteo", () => {
    const summary = summarizeContabilidadSyncAttention([
      { status: "paid", contabilidadSync: { result: "failed", reason: "No se encontró el código TEST-1 en contabilidad." } },
      { status: "paid", contabilidadSync: { result: "failed", reason: "No se pudo iniciar sesión con Contabilidad." } },
      { status: "fulfilled", contabilidadSync: null },
    ]);

    const markup = renderToStaticMarkup(createElement(AdminSalesSyncAlertContent, { summary }));

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Atención de sincronización con Contabilidad");
    expect(markup).toContain("1 pedido tiene un código no encontrado en Contabilidad; 1 pedido con otro error de sincronización; 1 pendiente de registro.");
  });
});
