import React from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { contabilidadSyncAttentionMessage, summarizeContabilidadSyncAttention } from "@/lib/contabilidadSyncStatus";

export function AdminSalesSyncAlertContent({ summary }: { summary: ReturnType<typeof summarizeContabilidadSyncAttention> }) {
  return <section role="alert" className="fixed bottom-5 left-5 right-5 z-50 mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-xl">
    <p className="font-bold">Atención de sincronización con Contabilidad</p>
    <p className="mt-1 leading-5">{contabilidadSyncAttentionMessage(summary)}</p>
  </section>;
}

export function AdminSalesSyncAlert() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const orders = trpc.admin.orders.list.useQuery(undefined, { enabled: isAdmin });
  if (!isAdmin) return null;

  const summary = summarizeContabilidadSyncAttention(orders.data ?? []);
  const { attention } = summary;
  if (!attention.length) return null;
  return <AdminSalesSyncAlertContent summary={summary} />;
}
