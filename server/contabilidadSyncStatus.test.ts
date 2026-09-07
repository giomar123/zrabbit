import { describe, expect, it } from "vitest";
import { getContabilidadSyncState, summarizeContabilidadSyncAttention } from "../client/src/lib/contabilidadSyncStatus";

describe("estado de sincronización de ventas", () => {
  it("diferencia una venta pendiente, un registro exitoso y un SKU inexistente", () => {
    expect(getContabilidadSyncState("paid", null)).toMatchObject({ label: "Pendiente de registro", retryAllowed: true });
    expect(getContabilidadSyncState("fulfilled", { result: "synchronized" })).toMatchObject({ label: "Registrado en Contabilidad", retryAllowed: false });
    expect(getContabilidadSyncState("paid", { result: "failed", reason: "No se encontró el código YAPE-TEST-001 en contabilidad." })).toMatchObject({ label: "Código no encontrado en Contabilidad", isMissingSku: true, retryAllowed: true });
  });

  it("resume los pedidos que requieren revisión administrativa", () => {
    const summary = summarizeContabilidadSyncAttention([
      { status: "paid", contabilidadSync: null },
      { status: "paid", contabilidadSync: { result: "failed", reason: "No se encontró el código ABC-1 en contabilidad." } },
      { status: "fulfilled", contabilidadSync: { result: "synchronized" } },
      { status: "awaiting_payment", contabilidadSync: null },
    ]);
    expect(summary.attention).toHaveLength(2);
    expect(summary.failed).toHaveLength(1);
    expect(summary.pending).toBe(1);
    expect(summary.missingSku).toHaveLength(1);
    expect(summary.failed.length - summary.missingSku.length).toBe(0);
  });
});
