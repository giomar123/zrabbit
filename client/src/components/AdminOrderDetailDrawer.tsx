import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";

const money = (cents: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(cents / 100);
const date = (value: Date | string) => new Date(value).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
const statusLabel = (status: string) => ({ awaiting_payment: "Esperando pago", paid: "Pagado", fulfilled: "Entregado", cancelled: "Cancelado", pending: "Pendiente" }[status] ?? status);

export function AdminOrderDetailDrawer() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [orderId, setOrderId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const orders = trpc.admin.orders.list.useQuery(undefined, { enabled: isAdmin });
  const events = trpc.admin.orders.paymentEvents.useQuery({ orderId: orderId ?? 0 }, { enabled: isAdmin && orderId !== null });
  const order = orders.data?.find(entry => entry.id === orderId);

  useEffect(() => {
    const openDetail = (event: Event) => {
      const id = Number((event as CustomEvent<number>).detail);
      if (Number.isInteger(id) && id > 0) { setOrderId(id); setOpen(true); }
    };
    window.addEventListener("zrabbit:open-order-detail", openDetail);
    return () => window.removeEventListener("zrabbit:open-order-detail", openDetail);
  }, []);

  if (!isAdmin) return null;
  return <Sheet open={open} onOpenChange={setOpen}><SheetContent side="right" className="w-full overflow-y-auto bg-white p-0 sm:max-w-xl"><SheetHeader className="border-b border-slate-200 bg-[#fffaf2] pr-12"><SheetTitle>Detalle del pedido</SheetTitle><SheetDescription>{order ? `${order.orderNumber} · ${statusLabel(order.status)}` : "Cargando pedido…"}</SheetDescription></SheetHeader>{!order ? <p className="p-5 text-sm text-slate-500">Cargando información del pedido…</p> : <div className="space-y-5 p-5 text-sm text-[#172033]"><section className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Cliente</p><p className="mt-2 font-semibold">{order.customerName}</p><p>{order.customerEmail}</p><p>{order.customerPhone || "Sin teléfono registrado"}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pago</p><p className="mt-2"><strong>Mercado Pago</strong> · {statusLabel(order.mercadoPagoStatus || order.status)}</p><p className="break-all text-xs text-slate-600">ID: {order.mercadoPagoPaymentId || "Pendiente de aprobación"}</p><p className="mt-2 text-xs text-slate-500">Creado {date(order.createdAt)}</p></div></section><section className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Entrega por {order.shippingMethod === "shalom" ? "Shalom" : order.shippingMethod}</p><p className="mt-2 font-semibold">{order.shippingAddress || "Dirección pendiente"}</p><p>Distrito: {order.shippingDistrict || "No registrado"}</p><p className="mt-3 font-semibold">Agencia: {order.shippingAgencyName || "No seleccionada"}</p><p className="text-slate-600">{order.shippingAgencyAddress || "Se coordinará a la dirección registrada."}</p></section><section className="overflow-hidden rounded-lg border border-slate-200"><p className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Artículos</p>{order.items.map(item => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><p className="font-semibold">{item.productName}</p><p className="text-xs text-slate-500">{item.quantity} × {money(item.unitPriceInCents)}</p></div><p className="font-semibold">{money(item.subtotalInCents)}</p></div>)}<div className="flex justify-between bg-slate-50 px-4 py-3 font-bold"><span>Total</span><span>{money(order.totalInCents)}</span></div></section><section className="rounded-lg border border-amber-100 bg-[#fffaf2] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#8a5110]">Eventos y sincronización</p>{events.data?.length ? <div className="mt-3 space-y-2">{events.data.map(event => <div key={event.id} className="rounded border border-amber-100 bg-white p-2 text-xs"><p><strong>{event.eventType === "contabilidad_sale" ? "Contabilidad" : event.result}</strong> · {event.reason || event.providerStatus || "Sin detalle"}</p><p className="mt-1 text-slate-500">{date(event.createdAt)}</p></div>)}</div> : <p className="mt-2 text-xs text-slate-600">Aún no hay eventos registrados.</p>}</section></div>}</SheetContent></Sheet>;
}
