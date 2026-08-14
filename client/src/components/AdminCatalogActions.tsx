import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronUp, Loader2, PackageCheck, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function AdminCatalogActions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const utils = trpc.useUtils();
  const products = trpc.admin.products.list.useQuery(undefined, { enabled: isAdmin });
  const history = trpc.admin.inventorySync.history.useQuery(undefined, { enabled: isAdmin });
  const drafts = useMemo(() => products.data?.filter(({ product }) => product.status === "draft") ?? [], [products.data]);
  const sync = trpc.admin.inventorySync.run.useMutation({
    onSuccess: async result => {
      toast.success(`Sincronización completa: ${result.createdCount} nuevos y ${result.updatedCount} actualizados.`);
      await Promise.all([products.refetch(), history.refetch(), utils.admin.dashboard.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });
  const publish = trpc.admin.products.publish.useMutation({
    onSuccess: async () => {
      toast.success("Producto publicado en el catálogo.");
      setSelectedDraftId("");
      await Promise.all([products.refetch(), utils.admin.dashboard.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  if (!isAdmin) return null;

  const latest = history.data?.[0];
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        aria-expanded={false}
        aria-controls="catalog-control-panel"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-[#e8cfaa] bg-[#fffaf2] px-4 py-3 text-sm font-bold text-[#172033] shadow-lg shadow-slate-900/15 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6862b] focus-visible:ring-offset-2"
      >
        <RefreshCw size={16} className={sync.isPending ? "animate-spin" : ""} />
        Catálogo
        <ChevronUp size={16} aria-hidden="true" />
      </button>
    );
  }
  return (
    <aside id="catalog-control-panel" className="fixed bottom-5 right-5 z-40 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-[#e8cfaa] bg-[#fffaf2] p-4 shadow-xl shadow-slate-900/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a5110]">Control de catálogo</p>
          <p className="mt-1 text-sm font-bold text-[#172033]">Inventario de contabilidad</p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          aria-label="Minimizar control de catálogo"
          aria-expanded={true}
          aria-controls="catalog-control-panel"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e8cfaa] bg-white text-[#8a5110] transition-colors hover:bg-[#fff1da] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6862b]"
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">La sincronización trae código, stock final y precio sugerido. Los productos nuevos se guardan como borrador y sin fotografías.</p>
      <button type="button" disabled={sync.isPending} onClick={() => sync.mutate()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#101824] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {sync.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        {sync.isPending ? "Sincronizando…" : "Sincronizar ahora"}
      </button>
      <p className="mt-2 text-[11px] text-slate-500">Ejecución automática en Railway los días 1 y 16 a las 09:00 (hora Perú).</p>
      {latest && <p className="mt-2 text-[11px] text-slate-500">Última ejecución: {new Date(latest.startedAt).toLocaleString("es-PE")} · {latest.status === "completed" ? `${latest.createdCount} nuevos` : latest.status}</p>}
      <div className="mt-4 border-t border-[#ead4ae] pt-4">
        <p className="text-sm font-bold text-[#172033]">Publicar después de cargar fotos</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">Selecciona un borrador al que ya subiste al menos una imagen.</p>
        <div className="mt-2 flex gap-2">
          <select className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs" value={selectedDraftId} onChange={event => setSelectedDraftId(event.target.value)}>
            <option value="">Selecciona borrador</option>
            {drafts.map(({ product }) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          <button type="button" disabled={!selectedDraftId || publish.isPending} onClick={() => publish.mutate({ id: Number(selectedDraftId) })} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#101824] bg-white px-3 py-2 text-xs font-bold text-[#101824] disabled:opacity-40">
            {publish.isPending ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />} Publicar
          </button>
        </div>
      </div>
    </aside>
  );
}
