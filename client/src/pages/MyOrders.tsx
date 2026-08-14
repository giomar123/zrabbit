import { StoreHeader } from "@/components/StoreHeader";
import { formatPrice } from "@/components/ProductCard";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, House, LockKeyhole, LogOut, MapPin, PackageCheck, Pencil, Plus, ReceiptText, Star, Trash2, Truck, XCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const statusMeta = {
  pending: { label: "Pedido registrado", tone: "text-amber-800 bg-amber-50 border-amber-200", icon: Clock3 },
  awaiting_payment: { label: "Esperando pago", tone: "text-amber-800 bg-amber-50 border-amber-200", icon: Clock3 },
  paid: { label: "Pago confirmado", tone: "text-emerald-800 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  fulfilled: { label: "Enviado por Shalom", tone: "text-sky-800 bg-sky-50 border-sky-200", icon: Truck },
  cancelled: { label: "Pedido cancelado", tone: "text-rose-800 bg-rose-50 border-rose-200", icon: XCircle },
} as const;

type AddressDraft = { id?: number; label: string; recipientName: string; phone: string; address: string; district: string; isDefault: boolean };
const emptyAddress = (recipientName = ""): AddressDraft => ({ label: "Casa", recipientName, phone: "", address: "", district: "", isDefault: true });

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function AddressForm({ initial, onCancel, onSave, isSaving }: { initial: AddressDraft; onCancel: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void; isSaving: boolean }) {
  return <form key={initial.id ?? "new"} onSubmit={onSave} className="mt-5 grid gap-4 border-t border-[#e8e8e2] pt-5 sm:grid-cols-2">
    <label className="form-label">Nombre de la dirección<input required name="label" defaultValue={initial.label} className="form-input" placeholder="Casa, oficina, regalo…" /></label>
    <label className="form-label">Recibe<input required name="recipientName" defaultValue={initial.recipientName} className="form-input" placeholder="Nombre completo" /></label>
    <label className="form-label">Teléfono<input name="phone" defaultValue={initial.phone} className="form-input" placeholder="999 999 999" /></label>
    <label className="form-label">Distrito<input required name="district" defaultValue={initial.district} className="form-input" placeholder="Ej. Miraflores" /></label>
    <label className="form-label sm:col-span-2">Dirección y referencia<textarea required name="address" defaultValue={initial.address} className="form-input min-h-24 resize-y" placeholder="Calle, número, departamento y referencia" /></label>
    <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input name="isDefault" type="checkbox" defaultChecked={initial.isDefault} /> Usar como dirección predeterminada</label>
    <div className="flex flex-wrap gap-3 sm:col-span-2"><button disabled={isSaving} className="memphis-button bg-[#101824] text-white disabled:opacity-50">{isSaving ? "Guardando…" : "Guardar dirección"}</button><button type="button" onClick={onCancel} className="memphis-button border-[#d7d7d0] bg-white">Cancelar</button></div>
  </form>;
}

export default function MyOrders() {
  const customerQuery = trpc.customer.me.useQuery();
  const ordersQuery = trpc.customer.orders.useQuery(undefined, { enabled: Boolean(customerQuery.data), retry: false });
  const addressesQuery = trpc.customer.addresses.list.useQuery(undefined, { enabled: Boolean(customerQuery.data), retry: false });
  const utils = trpc.useUtils();
  const [editingAddress, setEditingAddress] = useState<AddressDraft | null>(null);
  const logout = trpc.customer.logout.useMutation({ onSuccess: () => { void utils.customer.me.invalidate(); void utils.customer.orders.invalidate(); void utils.customer.addresses.list.invalidate(); } });
  const saveAddress = trpc.customer.addresses.save.useMutation({ onSuccess: () => { toast.success("Dirección guardada."); setEditingAddress(null); void utils.customer.addresses.list.invalidate(); }, onError: error => toast.error(error.message) });
  const removeAddress = trpc.customer.addresses.remove.useMutation({ onSuccess: () => { toast.success("Dirección eliminada."); void utils.customer.addresses.list.invalidate(); }, onError: error => toast.error(error.message) });

  const customer = customerQuery.data;
  const isLoading = customerQuery.isLoading || (Boolean(customer) && (ordersQuery.isLoading || addressesQuery.isLoading));

  const submitAddress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    saveAddress.mutate({ id: editingAddress?.id, label: String(data.get("label")), recipientName: String(data.get("recipientName")), phone: String(data.get("phone") || ""), address: String(data.get("address")), district: String(data.get("district")), isDefault: data.get("isDefault") === "on" });
  };

  if (isLoading) return <div className="min-h-screen bg-peach"><StoreHeader /><main className="container py-14"><div className="h-10 w-48 animate-pulse bg-[#e9e9e3]" /><div className="mt-8 h-56 animate-pulse bg-white" /></main></div>;

  if (!customer) return <div className="min-h-screen bg-peach text-ink"><StoreHeader /><main className="container py-10 sm:py-16"><section className="mx-auto max-w-2xl border border-[#deded7] bg-white p-7 sm:p-10"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#101824] text-[#eac28f]"><ReceiptText size={23} /></div><p className="editorial-label mt-7">Seguimiento seguro</p><h1 className="section-title mt-3">Tus pedidos,<br />en un solo lugar.</h1><p className="mt-5 max-w-xl text-sm leading-relaxed text-ink/65">Ingresa con la misma cuenta Gmail que utilizaste al comprar. Por seguridad, solo verás tus pedidos y tus direcciones guardadas.</p><a href="/api/auth/customer/google/login" className="memphis-button mt-8 inline-flex bg-[#101824] hover:bg-[#24354b]"><span className="grid h-5 w-5 place-items-center rounded-full bg-white font-sans text-xs font-bold text-[#4285f4]">G</span><span className="text-[#fff9ee]">Continuar con Google</span></a><p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink/55"><LockKeyhole className="mt-0.5 shrink-0" size={14} /> No creamos una contraseña nueva ni mostramos direcciones, teléfonos ni pedidos de otros clientes.</p><Link href="/catalogo" className="mt-7 block text-xs font-bold uppercase tracking-[.13em] text-ink/70 underline underline-offset-4">Volver a la colección</Link></section></main></div>;

  const orders = ordersQuery.data ?? [];
  const addresses = addressesQuery.data ?? [];
  return <div className="min-h-screen bg-peach text-ink"><StoreHeader /><main className="container py-9 sm:py-12"><div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#d7d7d0] pb-7"><div><p className="editorial-label">Área de cliente</p><h1 className="section-title mt-3">Mis pedidos.</h1><p className="mt-3 text-sm text-ink/60">Sesión iniciada como <strong>{customer.email}</strong></p></div><button onClick={() => logout.mutate()} disabled={logout.isPending} className="inline-flex items-center gap-2 border border-[#d7d7d0] bg-white px-4 py-3 text-xs font-bold uppercase tracking-[.11em] transition-colors hover:border-ink disabled:opacity-50"><LogOut size={15} /> Salir</button></div>

  <section className="mt-8 border border-[#deded7] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="editorial-label">Checkout más rápido</p><h2 className="mt-2 font-serif text-3xl">Mis direcciones.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/60">Guarda varias direcciones y marca una como predeterminada para reutilizarla al comprar.</p></div><button onClick={() => setEditingAddress(emptyAddress(customer.name))} className="memphis-button bg-[#101824] text-white"><Plus size={15} /> Nueva dirección</button></div>{addressesQuery.isError ? <p className="mt-5 text-sm text-rose-700">No pudimos cargar tus direcciones. Inténtalo de nuevo.</p> : addresses.length === 0 && !editingAddress ? <div className="mt-5 flex items-center gap-3 border-t border-[#e8e8e2] pt-5 text-sm text-ink/60"><House className="text-[#d89542]" size={20} /> Aún no tienes direcciones guardadas.</div> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{addresses.map(address => <article key={address.id} className={`relative border p-4 ${address.isDefault ? "border-[#d89542] bg-[#fffaf0]" : "border-[#deded7]"}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{address.label}</h3>{address.isDefault && <span className="inline-flex items-center gap-1 bg-[#d89542] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#101824]"><Star size={11} fill="currentColor" /> Predeterminada</span>}</div><p className="mt-3 text-sm font-semibold">{address.recipientName}</p><p className="mt-1 text-sm leading-relaxed text-ink/65">{address.address}<br />{address.district}{address.phone ? ` · ${address.phone}` : ""}</p></div><MapPin className="shrink-0 text-[#d89542]" size={19} /></div><div className="mt-4 flex gap-3 border-t border-black/8 pt-4"><button onClick={() => setEditingAddress({ id: address.id, label: address.label, recipientName: address.recipientName, phone: address.phone ?? "", address: address.address, district: address.district, isDefault: address.isDefault })} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[.1em] underline underline-offset-4"><Pencil size={13} /> Editar</button><button onClick={() => { if (window.confirm(`¿Eliminar la dirección ${address.label}?`)) removeAddress.mutate({ id: address.id }); }} disabled={removeAddress.isPending} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[.1em] text-rose-700 underline underline-offset-4 disabled:opacity-50"><Trash2 size={13} /> Eliminar</button></div></article>)}</div>}{editingAddress && <AddressForm initial={editingAddress} onCancel={() => setEditingAddress(null)} onSave={submitAddress} isSaving={saveAddress.isPending} />}</section>

  {ordersQuery.isError ? <section className="mt-8 border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">No pudimos actualizar tus pedidos. Vuelve a intentarlo en unos minutos.</section> : orders.length === 0 ? <section className="mt-8 grid min-h-72 place-items-center border border-[#deded7] bg-white p-8 text-center"><div><PackageCheck className="mx-auto text-[#d89542]" size={35} /><h2 className="mt-5 font-serif text-3xl">Aún no encontramos pedidos.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/60">Verifica que hayas ingresado con el mismo Gmail usado al finalizar la compra.</p><Link href="/catalogo" className="memphis-button mt-7 inline-flex bg-[#101824] text-white">Ver colección</Link></div></section> : <section className="mt-8 space-y-5">{orders.map(order => { const meta = statusMeta[order.status]; const StatusIcon = meta.icon; return <article key={order.id} className="overflow-hidden border border-[#deded7] bg-white"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e8e8e2] p-5 sm:p-6"><div><p className="editorial-label">Pedido {order.orderNumber}</p><p className="mt-2 text-sm text-ink/60">Realizado el {formatDate(order.createdAt)}</p></div><div className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-bold ${meta.tone}`}><StatusIcon size={15} /> {meta.label}</div></div><div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:p-6"><div><h2 className="text-sm font-extrabold uppercase tracking-[.12em]">Productos</h2><ul className="mt-4 space-y-3">{order.items.map(item => <li key={item.id} className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden bg-[#f0f0eb]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <PackageCheck size={18} className="text-ink/45" />}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{item.productName}</p><p className="mt-0.5 text-xs text-ink/55">{item.quantity} × {formatPrice(item.unitPriceInCents)}</p></div></li>)}</ul></div><aside className="border-t border-[#e8e8e2] pt-5 sm:min-w-48 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><p className="text-xs font-bold uppercase tracking-[.12em] text-ink/55">Total pagado</p><p className="mt-2 text-2xl font-extrabold">{formatPrice(order.totalInCents)}</p><p className="mt-5 text-xs leading-relaxed text-ink/60">{order.shippingMethod === "yape_test" ? "Pedido de prueba Yape; no incluye envío." : order.status === "fulfilled" ? "Tu pedido fue marcado como enviado por Shalom." : "Coordinaremos el envío por Shalom después de confirmar el pago."}</p></aside></div></article>; })}</section>}</main></div>;
}
