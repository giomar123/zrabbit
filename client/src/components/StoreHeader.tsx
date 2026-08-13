import { useCart } from "@/contexts/CartContext";
import { Menu, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export function StoreHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const links = ["Novedades", "Dragon Ball", "Pokémon", "Ofertas"];
  return <header className="sticky top-0 z-50 border-b-2 border-ink/90 bg-peach/95 backdrop-blur">
    <div className="container flex h-18 items-center justify-between gap-4 py-3">
      <Link href="/" className="group flex shrink-0 items-center gap-2" aria-label="Ir a inicio">
        <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-sun text-lg transition-transform group-hover:-rotate-12"><Sparkles size={19} strokeWidth={3} /></span>
        <span className="text-xl font-black uppercase leading-none tracking-[-0.08em] drop-shadow-[2px_2px_0_#fff] sm:text-2xl">Figura<br />Fiebre</span>
      </Link>
      <nav className="hidden items-center gap-5 lg:flex" aria-label="Navegación principal">
        {links.map(link => <Link key={link} href={link === "Novedades" ? "/catalogo" : link === "Ofertas" ? "/catalogo?ofertas=1" : "/catalogo"} className="text-sm font-extrabold uppercase tracking-[0.09em] transition-transform hover:-translate-y-0.5 hover:underline">{link}</Link>)}
      </nav>
      <div className="flex items-center gap-2">
        <button className="hidden h-10 w-10 place-items-center rounded-full border-2 border-ink bg-white transition-transform hover:-rotate-6 sm:grid" aria-label="Buscar productos"><Search size={18} /></button>
        <Link href="/carrito" className="relative grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-mint transition-transform hover:rotate-6" aria-label={`Ver carrito, ${count} productos`}><ShoppingBag size={18} strokeWidth={2.6} />{count > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-sun px-1 text-[10px] font-black">{count}</span>}</Link>
        <button onClick={() => setOpen(value => !value)} className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-lilac lg:hidden" aria-expanded={open} aria-label="Abrir menú">{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </div>
    {open && <nav className="container grid gap-1 border-t-2 border-ink py-4 lg:hidden" aria-label="Navegación móvil">{links.map(link => <Link key={link} onClick={() => setOpen(false)} href="/catalogo" className="rounded-xl px-3 py-2 text-sm font-black uppercase hover:bg-white">{link}</Link>)}</nav>}
  </header>;
}
