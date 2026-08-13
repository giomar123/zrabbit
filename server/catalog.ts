import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { categories, orderItems, orders, productImages, products } from "../drizzle/schema";
import { getDb } from "./db";

export type CatalogFilters = { categorySlug?: string; minPrice?: number; maxPrice?: number; availableOnly?: boolean; featuredOnly?: boolean; offerOnly?: boolean };

export const MINIMUM_ORDER_IN_CENTS = 9_900;
export const FREE_SHIPPING_THRESHOLD_IN_CENTS = 19_900;

export function validateMinimumOrder(totalInCents: number) {
  if (totalInCents < MINIMUM_ORDER_IN_CENTS) throw new Error("El pedido mínimo es de S/ 99.00.");
}

export function qualifiesForFreeShipping(totalInCents: number) {
  return totalInCents >= FREE_SHIPPING_THRESHOLD_IN_CENTS;
}

export function validateOrderQuantity(product: { name: string; stock: number; status: string }, quantity: number) {
  if (product.status !== "active") throw new Error(`${product.name} no está disponible.`);
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("La cantidad solicitada no es válida.");
  if (product.stock < quantity) throw new Error(`Stock insuficiente para ${product.name}.`);
}

export async function listActiveCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.name));
}

export async function listCatalogProducts(filters: CatalogFilters = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(products.status, "active")];
  if (filters.categorySlug) conditions.push(eq(categories.slug, filters.categorySlug));
  if (filters.minPrice !== undefined) conditions.push(gte(products.priceInCents, filters.minPrice));
  if (filters.maxPrice !== undefined) conditions.push(lte(products.priceInCents, filters.maxPrice));
  if (filters.availableOnly) conditions.push(gte(products.stock, 1));
  if (filters.featuredOnly) conditions.push(eq(products.isFeatured, true));
  if (filters.offerOnly) conditions.push(eq(products.isOffer, true));
  return db.select({ product: products, category: categories }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).where(and(...conditions)).orderBy(desc(products.isFeatured), desc(products.createdAt));
}

export async function getCatalogProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ product: products, category: categories }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(products.slug, slug), eq(products.status, "active"))).limit(1);
  if (!result[0]) return null;
  const images = await db.select().from(productImages).where(eq(productImages.productId, result[0].product.id)).orderBy(asc(productImages.sortOrder));
  return { ...result[0], images };
}

export async function createPendingOrder(input: { customerName: string; customerEmail: string; customerPhone?: string; shippingAddress?: string; shippingDistrict?: string; items: { productId: number; quantity: number }[] }) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const uniqueIds = Array.from(new Set(input.items.map(item => item.productId)));
  const catalog = await db.select().from(products).where(and(inArray(products.id, uniqueIds), eq(products.status, "active")));
  if (catalog.length !== uniqueIds.length) throw new Error("Uno o más productos ya no están disponibles.");
  const enriched = input.items.map(item => {
    const product = catalog.find(candidate => candidate.id === item.productId);
    if (!product) throw new Error("Uno o más productos ya no están disponibles.");
    validateOrderQuantity(product, item.quantity);
    return { product, quantity: item.quantity, subtotal: product.priceInCents * item.quantity };
  });
  const totalInCents = enriched.reduce((sum, item) => sum + item.subtotal, 0);
  validateMinimumOrder(totalInCents);
  const orderNumber = `FC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const result = await db.insert(orders).values({ orderNumber, customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone, shippingAddress: input.shippingAddress, shippingDistrict: input.shippingDistrict, shippingMethod: "shalom", isFreeShipping: qualifiesForFreeShipping(totalInCents), totalInCents, status: "awaiting_payment" });
  const orderId = Number(result[0].insertId);
  await db.insert(orderItems).values(enriched.map(({ product, quantity, subtotal }) => ({ orderId, productId: product.id, productName: product.name, imageUrl: product.mainImageUrl, unitPriceInCents: product.priceInCents, quantity, subtotalInCents: subtotal })));
  return { id: orderId, orderNumber, totalInCents, items: enriched };
}
