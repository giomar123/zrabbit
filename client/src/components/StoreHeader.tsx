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
  return <header className="sticky top-0 z-50 border-b border-[#deded7] bg-[#fbfbf8]/95 backdrop-blur"><div className="container flex h-18 items-center justify-between gap-5"><Link href="/" className="shrink-0 font-black uppercase tracking-[-.08em]" aria-label="Ir al inicio"><span className="block text-xl leading-none sm:text-2xl">FIGURA</span><span className="block text-[10px] tracking-[.38em] sm:text-xs">FIEBRE</span></Link><nav className="hidden items-center gap-7 lg:flex" aria-label="Navegación principal">{links.map(link => <Link key={link.label} href={link.href} className="text-[11px] font-extrabold uppercase tracking-[.13em] text-ink/75 transition-colors hover:text-ink">{link.label}</Link>)}</nav><div className="flex items-center gap-1"><button className="hidden grid h-10 w-10 place-items-center text-ink/75 sm:grid" aria-label="Buscar productos"><Search size={18} strokeWidth={1.8} /></button><Link href="/carrito" className="relative grid h-10 w-10 place-items-center" aria-label={`Ver carrito, ${count} productos`}><ShoppingBag size={19} strokeWidth={1.8} />{count > 0 && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[9px] font-bold text-white">{count}</span>}</Link><button onClick={() => setOpen(value => !value)} className="grid h-10 w-10 place-items-center lg:hidden" aria-expanded={open} aria-label="Abrir menú">{open ? <X size={20} /> : <Menu size={20} />}</button></div></div>{open && <nav className="container grid border-t border-[#deded7] py-3 lg:hidden" aria-label="Navegación móvil">{links.map(link => <Link key={link.label} onClick={() => setOpen(false)} href={link.href} className="border-b border-[#ededE8] py-3 text-xs font-bold uppercase tracking-[.13em]">{link.label}</Link>)}</nav>}</header>;
}
