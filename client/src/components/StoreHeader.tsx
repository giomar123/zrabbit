import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";

const links = [
  { label: "Novedades", href: "/catalogo" },
  { label: "Dragon Ball", href: "/catalogo?categoria=dragon-ball" },
  { label: "Pokémon", href: "/catalogo?categoria=pokemon" },
  { label: "Ofertas", href: "/catalogo?ofertas=1" },
];

export function StoreHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-white/10 bg-[#101824]/95 text-[#fff9ee] backdrop-blur"><div className="container flex h-18 items-center justify-between gap-5"><Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Ir al inicio"><img src="/manus-storage/logo-zrabbit_4a0dad69.png" alt="" className="h-10 w-10 object-contain" /><span className="font-black text-lg lowercase tracking-[-.07em] text-[#fff9ee] sm:text-xl">z<span className="text-[#eac28f]">Rabbit</span></span></Link><nav className="hidden items-center gap-7 lg:flex" aria-label="Navegación principal">{links.map(link => <Link key={link.label} href={link.href} className="text-[11px] font-extrabold uppercase tracking-[.13em] text-white/75 transition-colors hover:text-[#eac28f]">{link.label}</Link>)}</nav><div className="flex items-center gap-1"><button className="hidden grid h-10 w-10 place-items-center text-white/80 sm:grid" aria-label="Buscar productos"><Search size={18} strokeWidth={1.8} /></button><Link href="/carrito" className="relative grid h-10 w-10 place-items-center" aria-label={`Ver carrito, ${count} productos`}><ShoppingBag size={19} strokeWidth={1.8} />{count > 0 && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#d89542] px-1 text-[9px] font-bold text-[#101824]">{count}</span>}</Link><button onClick={() => setOpen(value => !value)} className="grid h-10 w-10 place-items-center lg:hidden" aria-expanded={open} aria-label="Abrir menú">{open ? <X size={20} /> : <Menu size={20} />}</button></div></div>{open && <nav className="container grid border-t border-white/10 py-3 lg:hidden" aria-label="Navegación móvil">{links.map(link => <Link key={link.label} onClick={() => setOpen(false)} href={link.href} className="border-b border-white/10 py-3 text-xs font-bold uppercase tracking-[.13em]">{link.label}</Link>)}</nav>}</header>;
}
