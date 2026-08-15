import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizedGoogleEmails, categories, customerAddresses, orderItems, orders, paymentEvents, productImages, products, users } from "../drizzle/schema";
import { createPendingOrder, getCatalogProductBySlug, listActiveCategories, listCatalogProducts } from "./catalog";
import { getContabilidadSyncSettings, listContabilidadSyncRuns, previewContabilidadImport, runContabilidadImport } from "./contabilidadSync";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { isGoogleAuthConfigured, logoutGoogleAdmin, logoutGoogleCustomer } from "./_core/googleAuth";
import { createMercadoPagoPayment, isMercadoPagoWebhookConfigured } from "./mercadoPago";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, catalogEditorProcedure, customerProcedure, publicProcedure, router } from "./_core/trpc";

const slugSchema = z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones.");
const categoryInput = z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(100), slug: slugSchema.max(120), description: z.string().trim().max(1000).optional(), accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/), isActive: z.boolean().default(true) });
const productInput = z.object({
  id: z.number().int().positive().optional(), categoryId: z.number().int().positive(), name: z.string().trim().min(2).max(180), slug: slugSchema,
  sku: z.string().trim().max(80).optional(), shortDescription: z.string().trim().min(5).max(280), description: z.string().trim().max(5000).optional(),
  priceInCents: z.number().int().min(1), compareAtPriceInCents: z.number().int().min(1).nullable().optional(), stock: z.number().int().min(0),
  status: z.enum(["draft", "active", "archived"]), isFeatured: z.boolean().default(false), isOffer: z.boolean().default(false), mainImageUrl: z.string().url().nullable().optional(),
  metaTitle: z.string().trim().max(180).optional(), metaDescription: z.string().trim().max(300).optional(),
});
const customerAddressInput = z.object({
  id: z.number().int().positive().optional(),
  label: z.string().trim().min(2).max(80),
  recipientName: z.string().trim().min(3).max(160),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().min(8).max(1000),
  district: z.string().trim().min(2).max(120),
  isDefault: z.boolean().default(false),
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
    googleStatus: publicProcedure.query(() => ({ configured: isGoogleAuthConfigured() })),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      logoutGoogleAdmin(ctx.req, ctx.res);
      logoutGoogleCustomer(ctx.req, ctx.res);
      return { success: true } as const;
    }),
  }),
  customer: router({
    me: publicProcedure.query(({ ctx }) => ctx.customer ?? null),
    logout: publicProcedure.mutation(({ ctx }) => { logoutGoogleCustomer(ctx.req, ctx.res); return { success: true } as const; }),
    orders: customerProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const email = ctx.customer.email.trim().toLowerCase();
      const orderRows = await db.select({
        id: orders.id, orderNumber: orders.orderNumber, totalInCents: orders.totalInCents, currency: orders.currency,
        status: orders.status, shippingMethod: orders.shippingMethod, shippingAgencyName: orders.shippingAgencyName, shippingAgencyAddress: orders.shippingAgencyAddress, isFreeShipping: orders.isFreeShipping, createdAt: orders.createdAt, updatedAt: orders.updatedAt,
      }).from(orders).where(sql`LOWER(${orders.customerEmail}) = ${email}`).orderBy(desc(orders.createdAt));
      const orderIds = orderRows.map(order => order.id);
      const itemRows = orderIds.length ? await db.select({ id: orderItems.id, orderId: orderItems.orderId, productName: orderItems.productName, imageUrl: orderItems.imageUrl, unitPriceInCents: orderItems.unitPriceInCents, quantity: orderItems.quantity }).from(orderItems).where(inArray(orderItems.orderId, orderIds)) : [];
      return orderRows.map(order => ({ ...order, items: itemRows.filter(item => item.orderId === order.id) }));
    }),
    addresses: router({
      list: customerProcedure.query(async ({ ctx }) => {
        const db = await requireDb(); const email = ctx.customer.email.trim().toLowerCase();
        return db.select().from(customerAddresses).where(sql`LOWER(${customerAddresses.customerEmail}) = ${email}`).orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.updatedAt));
      }),
      save: customerProcedure.input(customerAddressInput).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const email = ctx.customer.email.trim().toLowerCase();
        const owned = await db.select().from(customerAddresses).where(sql`LOWER(${customerAddresses.customerEmail}) = ${email}`).orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.updatedAt));
        const current = input.id ? owned.find(address => address.id === input.id) : undefined;
        if (input.id && !current) throw new TRPCError({ code: "NOT_FOUND", message: "La dirección no existe." });
        const isDefault = input.isDefault || !owned.length || Boolean(current?.isDefault);
        if (isDefault) await db.update(customerAddresses).set({ isDefault: false }).where(sql`LOWER(${customerAddresses.customerEmail}) = ${email}`);
        const values = { customerEmail: email, label: input.label, recipientName: input.recipientName, phone: input.phone || null, address: input.address, district: input.district, isDefault };
        if (current) {
          await db.update(customerAddresses).set(values).where(and(eq(customerAddresses.id, current.id), sql`LOWER(${customerAddresses.customerEmail}) = ${email}`));
          return { id: current.id, isDefault };
        }
        const result = await db.insert(customerAddresses).values(values);
        return { id: Number(result[0].insertId), isDefault };
      }),
      remove: customerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const email = ctx.customer.email.trim().toLowerCase();
        const owned = await db.select().from(customerAddresses).where(sql`LOWER(${customerAddresses.customerEmail}) = ${email}`).orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.updatedAt));
        const current = owned.find(address => address.id === input.id);
        if (!current) return { success: true };
        await db.delete(customerAddresses).where(and(eq(customerAddresses.id, current.id), sql`LOWER(${customerAddresses.customerEmail}) = ${email}`));
        if (current.isDefault) {
          const [replacement] = owned.filter(address => address.id !== current.id);
          if (replacement) await db.update(customerAddresses).set({ isDefault: true }).where(eq(customerAddresses.id, replacement.id));
        }
        return { success: true };
      }),
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
      shippingAgencyName: z.string().trim().min(2).max(180).optional(), shippingAgencyAddress: z.string().trim().min(4).max(300).optional(),
      items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(10) })).min(1).max(20),
    })).mutation(async ({ ctx, input }) => {
      const order = await createPendingOrder(input);
      const customerEmail = ctx.customer?.email.trim().toLowerCase();
      const orderEmail = input.customerEmail.trim().toLowerCase();
      if (customerEmail && customerEmail === orderEmail && input.shippingAddress && input.shippingDistrict) {
        try {
          const db = await requireDb();
          const saved = await db.select().from(customerAddresses).where(and(sql`LOWER(${customerAddresses.customerEmail}) = ${customerEmail}`, eq(customerAddresses.address, input.shippingAddress.trim()), eq(customerAddresses.district, input.shippingDistrict.trim()))).limit(1);
          if (!saved[0]) {
            const current = await db.select({ id: customerAddresses.id }).from(customerAddresses).where(sql`LOWER(${customerAddresses.customerEmail}) = ${customerEmail}`).limit(1);
            await db.insert(customerAddresses).values({ customerEmail, label: "Dirección principal", recipientName: input.customerName.trim(), phone: input.customerPhone?.trim() || null, address: input.shippingAddress.trim(), district: input.shippingDistrict.trim(), isDefault: current.length === 0 });
          }
        } catch (error) {
          console.error("[Customer addresses] No se pudo guardar la dirección del checkout", error);
        }
      }
      return order;
    }),
    webhookStatus: publicProcedure.query(() => ({ configured: isMercadoPagoWebhookConfigured() })),
    pay: publicProcedure.input(z.object({ orderId: z.number().int().positive(), token: z.string().min(10), paymentMethodId: z.string().min(1), issuerId: z.string().optional(), installments: z.number().int().min(1).max(48), payerEmail: z.string().email(), identificationType: z.string().optional(), identificationNumber: z.string().optional(), clientPublicKeyPrefix: z.string().max(12).optional(), clientPublicKeyFingerprint: z.string().regex(/^[a-f0-9]{12}$/).optional() })).mutation(async ({ input }) => {
      try { return await createMercadoPagoPayment(input); }
      catch (error) {
        const paymentError = error as Error & { mercadoPagoStatus?: number; mercadoPagoCode?: string; mercadoPagoCause?: string };
        if (paymentError.mercadoPagoStatus) throw new TRPCError({ code: "BAD_REQUEST", message: JSON.stringify({ provider: "mercado_pago", status: paymentError.mercadoPagoStatus, code: paymentError.mercadoPagoCode ?? "unknown", cause: paymentError.mercadoPagoCause ?? "unknown" }) });
        throw error;
      }
    }),
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
    googleAccess: router({
      list: adminProcedure.query(async () => { const db = await requireDb(); return db.select().from(authorizedGoogleEmails).orderBy(desc(authorizedGoogleEmails.createdAt)); }),
      add: adminProcedure.input(z.object({ email: z.string().trim().email().max(320), role: z.enum(["editor", "admin"]).default("editor") })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const email = input.email.toLowerCase();
        await db.insert(authorizedGoogleEmails).values({ email, role: input.role, createdByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { email, role: input.role } });
        return { success: true, email, role: input.role };
      }),
      setRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["editor", "admin"]) })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(authorizedGoogleEmails).set({ role: input.role }).where(eq(authorizedGoogleEmails.id, input.id)); return { success: true }; }),
      remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await requireDb(); const row = await db.select().from(authorizedGoogleEmails).where(eq(authorizedGoogleEmails.id, input.id)).limit(1);
        if (!row[0]) return { success: true };
        if (row[0].email === ctx.user.email?.toLowerCase()) throw new Error("No puedes retirar el Gmail de tu sesión actual.");
        await db.delete(authorizedGoogleEmails).where(eq(authorizedGoogleEmails.id, input.id)); return { success: true };
      }),
    }),
    categories: router({
      list: catalogEditorProcedure.query(async () => { const db = await requireDb(); return db.select().from(categories).orderBy(desc(categories.createdAt)); }),
      save: adminProcedure.input(categoryInput).mutation(async ({ input }) => {
        const db = await requireDb(); const values = { name: input.name, slug: input.slug, description: input.description ?? null, accentColor: input.accentColor, isActive: input.isActive };
        if (input.id) { await db.update(categories).set(values).where(eq(categories.id, input.id)); return { id: input.id }; }
        const result = await db.insert(categories).values(values); return { id: Number(result[0].insertId) };
      }),
    }),
    products: router({
      list: catalogEditorProcedure.query(async () => { const db = await requireDb(); return db.select({ product: products, category: categories }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).orderBy(desc(products.updatedAt)); }),
      save: catalogEditorProcedure.input(productInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await requireDb();
        const current = (await db.select({ id: products.id }).from(products).where(eq(products.id, input.id)).limit(1))[0];
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "El producto no existe." });
        await db.update(products).set({
          shortDescription: input.shortDescription,
          description: input.description ?? null,
          status: input.status,
          isFeatured: input.isFeatured,
          isOffer: input.isOffer,
          metaTitle: input.metaTitle || null,
          metaDescription: input.metaDescription || null,
        }).where(eq(products.id, input.id));
        return { id: input.id };
      }),
      publish: catalogEditorProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await requireDb();
        const [product] = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
        if (!product) throw new Error("El producto no existe.");
        const images = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, input.id)).limit(1);
        if (!images[0]) throw new Error("Carga al menos una fotografía antes de publicar el producto.");
        await db.update(products).set({ status: "active" }).where(eq(products.id, input.id));
        return { success: true };
      }),
      archive: catalogEditorProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(products).set({ status: "archived" }).where(eq(products.id, input.id)); return { success: true }; }),
      updateStock: catalogEditorProcedure.input(z.object({ id: z.number().int().positive(), stock: z.number().int().min(0) })).mutation(() => {
        throw new TRPCError({ code: "FORBIDDEN", message: "El stock se actualiza únicamente desde contabilidad." });
      }),
    }),
    inventorySync: router({
      preview: adminProcedure.query(() => previewContabilidadImport()),
      run: adminProcedure.mutation(async () => { const result = await runContabilidadImport("manual"); return result; }),
      history: adminProcedure.query(() => listContabilidadSyncRuns()),
      settings: adminProcedure.query(() => getContabilidadSyncSettings()),
    }),
    images: router({
      list: catalogEditorProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ input }) => { const db = await requireDb(); return db.select().from(productImages).where(eq(productImages.productId, input.productId)).orderBy(productImages.sortOrder); }),
      upload: catalogEditorProcedure.input(z.object({ productId: z.number().int().positive(), filename: z.string().min(1).max(180), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataUrl: z.string().min(100).max(7_000_000), altText: z.string().trim().min(3).max(220) })).mutation(async ({ input }) => {
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
      update: catalogEditorProcedure.input(z.object({ id: z.number().int().positive(), altText: z.string().trim().min(3).max(220), sortOrder: z.number().int().min(0) })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(productImages).set({ altText: input.altText, sortOrder: input.sortOrder }).where(eq(productImages.id, input.id)); return { success: true }; }),
      makePrimary: catalogEditorProcedure.input(z.object({ id: z.number().int().positive(), productId: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await requireDb(); const image = await db.select().from(productImages).where(and(eq(productImages.id, input.id), eq(productImages.productId, input.productId))).limit(1);
        if (!image[0]) throw new Error("La imagen no existe.");
        await db.update(productImages).set({ isPrimary: false }).where(eq(productImages.productId, input.productId));
        await db.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, input.id));
        await db.update(products).set({ mainImageUrl: image[0].url }).where(eq(products.id, input.productId));
        return { success: true, url: image[0].url };
      }),
      remove: catalogEditorProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
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
      paymentEvents: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ input }) => { const db = await requireDb(); return db.select().from(paymentEvents).where(eq(paymentEvents.orderId, input.orderId)).orderBy(desc(paymentEvents.createdAt)); }),
      updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "awaiting_payment", "paid", "cancelled", "fulfilled"]) })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(orders).set({ status: input.status }).where(eq(orders.id, input.id)); return { success: true }; }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
