import { useCart } from "@/contexts/CartContext";
import { ShoppingBag } from "lucide-react";
import { Link } from "wouter";

type ProductCardProps = { product: { id: number; name: string; slug: string; shortDescription: string; priceInCents: number; compareAtPriceInCents: number | null; stock: number; mainImageUrl: string | null; isOffer: boolean }; categoryName?: string };
export function formatPrice(value: number) { return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value / 100); }

export function ProductCard({ product, categoryName }: ProductCardProps) {
  const { addItem } = useCart();
  return <article className="memphis-card group flex h-full flex-col bg-white p-3">
    <Link href={`/productos/${product.slug}`} className="relative block aspect-[4/4.4] overflow-hidden rounded-xl border-2 border-ink bg-[#f7f3ef]">
      {product.mainImageUrl ? <img src={product.mainImageUrl} alt={product.name} className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105" /> : <span className="grid h-full place-items-center text-center text-sm font-bold">Imagen próximamente</span>}
      {product.isOffer && <span className="absolute left-2 top-2 rotate-[-8deg] rounded-md border-2 border-ink bg-sun px-2 py-1 text-[10px] font-black uppercase">Oferta</span>}
      {product.stock < 1 && <span className="absolute bottom-2 left-2 rounded-md border-2 border-ink bg-ink px-2 py-1 text-[10px] font-black uppercase text-white">Agotado</span>}
    </Link>
    <div className="flex flex-1 flex-col gap-2 px-1 pt-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/60">{categoryName ?? "Coleccionables"}</p>
      <Link href={`/productos/${product.slug}`} className="line-clamp-2 font-black leading-tight underline-offset-2 hover:underline">{product.name}</Link>
      <p className="line-clamp-2 text-xs leading-relaxed text-ink/70">{product.shortDescription}</p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div><strong className="text-lg font-black">{formatPrice(product.priceInCents)}</strong>{product.compareAtPriceInCents && <span className="ml-1 text-xs font-bold text-ink/45 line-through">{formatPrice(product.compareAtPriceInCents)}</span>}</div>
        <button onClick={() => addItem({ productId: product.id, name: product.name, priceInCents: product.priceInCents, imageUrl: product.mainImageUrl, stock: product.stock })} disabled={product.stock < 1} className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-mint transition-transform hover:-rotate-6 active:scale-95 disabled:cursor-not-allowed disabled:bg-ink/15" aria-label={`Añadir ${product.name} al carrito`}><ShoppingBag size={16} strokeWidth={2.7} /></button>
      </div>
    </div>
  </article>;
}
