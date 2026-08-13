import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { categories, orderItems, orders, productImages, products, users } from "../drizzle/schema";
import { createPendingOrder, getCatalogProductBySlug, listActiveCategories, listCatalogProducts } from "./catalog";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

const slugSchema = z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones.");
const categoryInput = z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(100), slug: slugSchema.max(120), description: z.string().trim().max(1000).optional(), accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/), isActive: z.boolean().default(true) });
const productInput = z.object({
  id: z.number().int().positive().optional(), categoryId: z.number().int().positive(), name: z.string().trim().min(2).max(180), slug: slugSchema,
  sku: z.string().trim().max(80).optional(), shortDescription: z.string().trim().min(5).max(280), description: z.string().trim().max(5000).optional(),
  priceInCents: z.number().int().min(1), compareAtPriceInCents: z.number().int().min(1).nullable().optional(), stock: z.number().int().min(0),
  status: z.enum(["draft", "active", "archived"]), isFeatured: z.boolean().default(false), isOffer: z.boolean().default(false), mainImageUrl: z.string().url().nullable().optional(),
  metaTitle: z.string().trim().max(180).optional(), metaDescription: z.string().trim().max(300).optional(),
});

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  return db;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    categories: publicProcedure.query(() => listActiveCategories()),
    products: publicProcedure.input(z.object({ categorySlug: z.string().optional(), minPrice: z.number().int().min(0).optional(), maxPrice: z.number().int().min(0).optional(), availableOnly: z.boolean().optional(), featuredOnly: z.boolean().optional(), offerOnly: z.boolean().optional() }).optional()).query(({ input }) => listCatalogProducts(input)),
    product: publicProcedure.input(z.object({ slug: slugSchema })).query(({ input }) => getCatalogProductBySlug(input.slug)),
  }),
  checkout: router({
    createOrder: publicProcedure.input(z.object({
      customerName: z.string().trim().min(3).max(160), customerEmail: z.string().email(), customerPhone: z.string().trim().max(40).optional(),
      shippingAddress: z.string().trim().min(8).max(1000).optional(), shippingDistrict: z.string().trim().max(120).optional(),
      items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(10) })).min(1).max(20),
    })).mutation(({ input }) => createPendingOrder(input)),
  }),
  admin: router({
    dashboard: adminProcedure.query(async () => {
      const db = await requireDb();
      const [productRows, orderRows, latestOrders] = await Promise.all([
        db.select().from(products), db.select().from(orders), db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
      ]);
      return {
        productCount: productRows.length, lowStockCount: productRows.filter(product => product.stock > 0 && product.stock <= 3).length,
        outOfStockCount: productRows.filter(product => product.stock === 0).length, orderCount: orderRows.length,
        paidRevenueInCents: orderRows.filter(order => order.status === "paid" || order.status === "fulfilled").reduce((sum, order) => sum + order.totalInCents, 0), latestOrders,
      };
    }),
    users: router({
      list: adminProcedure.query(async () => {
        const db = await requireDb();
        return db.select({ id: users.id, openId: users.openId, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.lastSignedIn));
      }),
      setRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["user", "admin"]) })).mutation(async ({ ctx, input }) => {
        if (input.id === ctx.user.id && input.role !== "admin") throw new Error("No puedes retirarte el acceso de administrador desde tu propia sesión.");
        const db = await requireDb();
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));
        return { success: true };
      }),
      remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (input.id === ctx.user.id) throw new Error("No puedes eliminar tu propia cuenta desde esta sesión.");
        const db = await requireDb();
        await db.delete(users).where(eq(users.id, input.id));
        return { success: true };
      }),
    }),
    categories: router({
      list: adminProcedure.query(async () => { const db = await requireDb(); return db.select().from(categories).orderBy(desc(categories.createdAt)); }),
      save: adminProcedure.input(categoryInput).mutation(async ({ input }) => {
        const db = await requireDb(); const values = { name: input.name, slug: input.slug, description: input.description ?? null, accentColor: input.accentColor, isActive: input.isActive };
        if (input.id) { await db.update(categories).set(values).where(eq(categories.id, input.id)); return { id: input.id }; }
        const result = await db.insert(categories).values(values); return { id: Number(result[0].insertId) };
      }),
    }),
    products: router({
      list: adminProcedure.query(async () => { const db = await requireDb(); return db.select({ product: products, category: categories }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).orderBy(desc(products.updatedAt)); }),
      save: adminProcedure.input(productInput).mutation(async ({ input }) => {
        const db = await requireDb(); const values = { categoryId: input.categoryId, name: input.name, slug: input.slug, sku: input.sku || null, shortDescription: input.shortDescription, description: input.description ?? null, priceInCents: input.priceInCents, compareAtPriceInCents: input.compareAtPriceInCents ?? null, stock: input.stock, status: input.status, isFeatured: input.isFeatured, isOffer: input.isOffer, mainImageUrl: input.mainImageUrl ?? null, metaTitle: input.metaTitle || null, metaDescription: input.metaDescription || null };
        if (input.id) { await db.update(products).set(values).where(eq(products.id, input.id)); return { id: input.id }; }
        const result = await db.insert(products).values(values); return { id: Number(result[0].insertId) };
      }),
      archive: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(products).set({ status: "archived" }).where(eq(products.id, input.id)); return { success: true }; }),
      updateStock: adminProcedure.input(z.object({ id: z.number().int().positive(), stock: z.number().int().min(0) })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(products).set({ stock: input.stock }).where(eq(products.id, input.id)); return { success: true }; }),
    }),
    images: router({
      list: adminProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ input }) => { const db = await requireDb(); return db.select().from(productImages).where(eq(productImages.productId, input.productId)).orderBy(productImages.sortOrder); }),
      upload: adminProcedure.input(z.object({ productId: z.number().int().positive(), filename: z.string().min(1).max(180), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataUrl: z.string().min(100).max(7_000_000), altText: z.string().trim().min(3).max(220) })).mutation(async ({ input }) => {
        const db = await requireDb();
        const product = await db.select({ id: products.id }).from(products).where(eq(products.id, input.productId)).limit(1);
        if (!product[0]) throw new Error("El producto no existe.");
        const encoded = input.dataUrl.split(",")[1];
        if (!encoded) throw new Error("El archivo de imagen no es válido.");
        const extension = input.contentType === "image/jpeg" ? "jpg" : input.contentType.split("/")[1];
        const { key, url } = await storagePut(`products/${input.productId}/${Date.now()}.${extension}`, Buffer.from(encoded, "base64"), input.contentType);
        const current = await db.select().from(productImages).where(eq(productImages.productId, input.productId));
        const isPrimary = current.length === 0;
        const result = await db.insert(productImages).values({ productId: input.productId, storageKey: key, url, altText: input.altText, sortOrder: current.length, isPrimary });
        if (isPrimary) await db.update(products).set({ mainImageUrl: url }).where(eq(products.id, input.productId));
        return { id: Number(result[0].insertId), key, url, isPrimary };
      }),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), altText: z.string().trim().min(3).max(220), sortOrder: z.number().int().min(0) })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(productImages).set({ altText: input.altText, sortOrder: input.sortOrder }).where(eq(productImages.id, input.id)); return { success: true }; }),
      makePrimary: adminProcedure.input(z.object({ id: z.number().int().positive(), productId: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await requireDb(); const image = await db.select().from(productImages).where(and(eq(productImages.id, input.id), eq(productImages.productId, input.productId))).limit(1);
        if (!image[0]) throw new Error("La imagen no existe.");
        await db.update(productImages).set({ isPrimary: false }).where(eq(productImages.productId, input.productId));
        await db.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, input.id));
        await db.update(products).set({ mainImageUrl: image[0].url }).where(eq(products.id, input.productId));
        return { success: true, url: image[0].url };
      }),
      remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await requireDb(); const image = await db.select().from(productImages).where(eq(productImages.id, input.id)).limit(1);
        if (!image[0]) return { success: true };
        await db.delete(productImages).where(eq(productImages.id, input.id));
        if (image[0].isPrimary) await db.update(products).set({ mainImageUrl: null }).where(eq(products.id, image[0].productId));
        return { success: true };
      }),
    }),
    orders: router({
      list: adminProcedure.query(async () => {
        const db = await requireDb();
        const [orderRows, itemRows] = await Promise.all([db.select().from(orders).orderBy(desc(orders.createdAt)), db.select().from(orderItems)]);
        return orderRows.map(order => ({ ...order, items: itemRows.filter(item => item.orderId === order.id) }));
      }),
      updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "awaiting_payment", "paid", "cancelled", "fulfilled"]) })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(orders).set({ status: input.status }).where(eq(orders.id, input.id)); return { success: true }; }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
