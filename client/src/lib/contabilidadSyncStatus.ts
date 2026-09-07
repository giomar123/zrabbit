export type ContabilidadSyncEvent = { result: string; reason?: string | null } | null;
export type ContabilidadSyncOrder = { status: string; contabilidadSync: ContabilidadSyncEvent };

export function getContabilidadSyncState(orderStatus: string, event: ContabilidadSyncEvent) {
  const retryEligible = orderStatus === "paid" || orderStatus === "fulfilled";
  if (!retryEligible) return { label: "No aplica todavía", needsAttention: false, retryAllowed: false, isMissingSku: false };
  if (!event) return { label: "Pendiente de registro", needsAttention: true, retryAllowed: true, isMissingSku: false };
  if (event.result === "synchronized") return { label: "Registrado en Contabilidad", needsAttention: false, retryAllowed: false, isMissingSku: false };
  const isMissingSku = event.result === "failed" && Boolean(event.reason?.includes("No se encontró el código"));
  return { label: isMissingSku ? "Código no encontrado en Contabilidad" : "Error de sincronización", needsAttention: true, retryAllowed: true, isMissingSku };
}

export function summarizeContabilidadSyncAttention(orders: ContabilidadSyncOrder[]) {
  const attention = orders.filter(order => getContabilidadSyncState(order.status, order.contabilidadSync).needsAttention);
  const failed = attention.filter(order => order.contabilidadSync?.result === "failed");
  const missingSku = attention.filter(order => getContabilidadSyncState(order.status, order.contabilidadSync).isMissingSku);
  return { attention, failed, pending: attention.length - failed.length, missingSku };
}
