import { formatPrice } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "wouter";

export function CartDrawer() {
  const cart = useCart();
  return <Sheet open={cart.isDrawerOpen} onOpenChange={open => open ? cart.openCart() : cart.closeCart()}>
    <SheetContent side="right" className="border-[#d7d7d0] bg-[#fffdfa] p-0 text-[#101824]">
      <SheetHeader className="border-b border-[#deded7] px-6 py-6 text-left">
        <SheetTitle className="font-serif text-3xl">Tu carrito.</SheetTitle>
        <SheetDescription className="text-[#101824]/60">{cart.count ? `${cart.count} ${cart.count === 1 ? "pieza seleccionada" : "piezas seleccionadas"}` : "Aún no agregaste piezas."}</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {!cart.items.length ? <div className="grid min-h-48 place-items-center text-center"><div><ShoppingBag className="mx-auto text-[#d89542]" size={28} /><p className="mt-3 text-sm text-[#101824]/60">Explora la colección para agregar tu primera figura.</p></div></div> : <div className="divide-y divide-[#e8e8e2]">{cart.items.map(item => <article key={item.productId} className="grid grid-cols-[68px_1fr_auto] gap-3 py-4"><div className="aspect-square overflow-hidden bg-[#f0f0eb]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <ShoppingBag className="h-full w-full p-5 text-[#101824]/45" />}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{item.name}</p><p className="mt-1 text-sm font-semibold">{formatPrice(item.priceInCents)}</p><div className="mt-3 flex h-8 w-fit items-center border border-[#101824] bg-white"><button onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)} className="grid h-full w-8 place-items-center" aria-label={`Reducir ${item.name}`}><Minus size={13} /></button><span className="w-7 text-center text-xs font-bold">{item.quantity}</span><button onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)} className="grid h-full w-8 place-items-center" aria-label={`Aumentar ${item.name}`}><Plus size={13} /></button></div></div><button onClick={() => cart.removeItem(item.productId)} className="self-start p-1 text-[#101824]/45 hover:text-rose-700" aria-label={`Eliminar ${item.name}`}><Trash2 size={16} /></button></article>)}</div>}
      </div>
      <SheetFooter className="border-t border-[#deded7] bg-white px-6 py-5"><div className="flex items-center justify-between text-sm"><span className="text-[#101824]/60">Total</span><strong className="text-lg">{formatPrice(cart.totalInCents)}</strong></div><Link href="/carrito" onClick={cart.closeCart} className="memphis-button mt-2 w-full bg-[#101824] text-center text-white">Ver carrito y pagar</Link><Button variant="outline" onClick={cart.closeCart} className="border-[#d7d7d0] text-[#101824]">Seguir comprando</Button></SheetFooter>
    </SheetContent>
  </Sheet>;
}
