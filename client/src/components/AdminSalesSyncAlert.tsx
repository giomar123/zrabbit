import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { summarizeContabilidadSyncAttention } from "@/lib/contabilidadSyncStatus";

export function AdminSalesSyncAlert() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const orders = trpc.admin.orders.list.useQuery(undefined, { enabled: isAdmin });
  if (!isAdmin) return null;

  const { attention, failed, pending, missingSku } = summarizeContabilidadSyncAttention(orders.data ?? []);
  if (!attention.length) return null;
  return <section role="alert" className="mx-auto mt-5 max-w-7xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-sm">
    <p className="font-bold">Atención de sincronización con Contabilidad</p>
    <p className="mt-1 leading-5">{missingSku.length ? `${missingSku.length} pedido${missingSku.length === 1 ? " tiene" : "s tienen"} un código no encontrado en Contabilidad. ` : ""}{failed.length ? `${failed.length} pedido${failed.length === 1 ? "" : "s"} con error` : ""}{failed.length && pending ? " y " : ""}{pending ? `${pending} pendiente${pending === 1 ? "" : "s"} de registro` : ""}. Abre <strong>Pedidos</strong> y usa <strong>Ver detalle</strong> para revisar el motivo y reintentar de forma segura.</p>
  </section>;
}
