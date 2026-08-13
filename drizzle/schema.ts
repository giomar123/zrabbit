import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 255 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const authorizedGoogleEmails = mysqlTable("authorizedGoogleEmails", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("authorized_google_emails_email_uq").on(table.email)]);

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  description: text("description"),
  accentColor: varchar("accentColor", { length: 20 }).default("#B7E4C7").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("categories_slug_uq").on(table.slug)]);

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  sku: varchar("sku", { length: 80 }),
  shortDescription: varchar("shortDescription", { length: 280 }).notNull(),
  description: text("description"),
  priceInCents: int("priceInCents").notNull(),
  compareAtPriceInCents: int("compareAtPriceInCents"),
  stock: int("stock").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isOffer: boolean("isOffer").default(false).notNull(),
  mainImageUrl: text("mainImageUrl"),
  metaTitle: varchar("metaTitle", { length: 180 }),
  metaDescription: varchar("metaDescription", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("products_slug_uq").on(table.slug),
  uniqueIndex("products_sku_uq").on(table.sku),
  index("products_category_idx").on(table.categoryId),
  index("products_catalog_idx").on(table.status, table.stock),
]);

export const productImages = mysqlTable("productImages", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  url: text("url").notNull(),
  altText: varchar("altText", { length: 220 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("product_images_product_idx").on(table.productId)]);

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 40 }),
  shippingAddress: text("shippingAddress"),
  shippingDistrict: varchar("shippingDistrict", { length: 120 }),
  totalInCents: int("totalInCents").notNull(),
  currency: varchar("currency", { length: 3 }).default("PEN").notNull(),
  status: mysqlEnum("status", ["pending", "awaiting_payment", "paid", "cancelled", "fulfilled"]).default("pending").notNull(),
  paymentProvider: mysqlEnum("paymentProvider", ["mercado_pago"]).default("mercado_pago").notNull(),
  mercadoPagoPreferenceId: varchar("mercadoPagoPreferenceId", { length: 180 }),
  mercadoPagoPaymentId: varchar("mercadoPagoPaymentId", { length: 180 }),
  mercadoPagoStatus: varchar("mercadoPagoStatus", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("orders_number_uq").on(table.orderNumber),
  index("orders_status_idx").on(table.status),
  index("orders_mp_payment_idx").on(table.mercadoPagoPaymentId),
]);

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 180 }).notNull(),
  imageUrl: text("imageUrl"),
  unitPriceInCents: int("unitPriceInCents").notNull(),
  quantity: int("quantity").notNull(),
  subtotalInCents: int("subtotalInCents").notNull(),
}, table => [index("order_items_order_idx").on(table.orderId)]);

export type User = typeof users.$inferSelect;
export type AuthorizedGoogleEmail = typeof authorizedGoogleEmails.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Order = typeof orders.$inferSelect;
