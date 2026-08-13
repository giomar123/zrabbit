import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { productId: number; name: string; priceInCents: number; imageUrl: string | null; stock: number; quantity: number };
type CartContextValue = { items: CartItem[]; count: number; totalInCents: number; addItem: (item: Omit<CartItem, "quantity">) => void; updateQuantity: (productId: number, quantity: number) => void; removeItem: (productId: number) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "figura-collectibles-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as CartItem[]; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(items)); }, [items]);
  const value = useMemo(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    totalInCents: items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0),
    addItem: (item: Omit<CartItem, "quantity">) => setItems(current => {
      const existing = current.find(candidate => candidate.productId === item.productId);
      if (!existing) return [...current, { ...item, quantity: 1 }];
      return current.map(candidate => candidate.productId === item.productId ? { ...candidate, quantity: Math.min(candidate.quantity + 1, candidate.stock) } : candidate);
    }),
    updateQuantity: (productId: number, quantity: number) => setItems(current => current.flatMap(item => item.productId === productId ? (quantity < 1 ? [] : [{ ...item, quantity: Math.min(quantity, item.stock) }]) : [item])),
    removeItem: (productId: number) => setItems(current => current.filter(item => item.productId !== productId)),
    clear: () => setItems([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe utilizarse dentro de CartProvider");
  return context;
}
