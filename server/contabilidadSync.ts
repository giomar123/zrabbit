import { desc, eq } from "drizzle-orm";
import { categories, inventorySyncRuns, inventorySyncSettings, products } from "../drizzle/schema";
import { getDb } from "./db";

const SOURCE_URL = "https://contabilidad.zrabbit.shop";
const RECEIVED_STATUS = "RECIBIDO";
export const RAILWAY_QUINCENAL_SYNC_CRON = "0 14 1,16 * *";

type SourceProduct = {
  id: number;
  code: string;
  name: string;
  categoryId: number | null;
};

type SourcePurchase = {
  id: number;
  purchaseDate: string;
  productId: number;
  quantity: number;
  suggestedPrice: string | number | null;
  status: string;
  product?: SourceProduct | null;
};

type SourceInventory = {
  productId: number;
  productCode: string;
  productName: string;
  categoryId: number | null;
  finalStock: number | string;
};

type SourceCategory = { id: number; name: string; slug?: string | null };

export type ImportedProductPreview = {
  sourceProductId: number;
  sku: string;
  slug: string;
  name: string;
  sourceCategoryId: number | null;
  sourceCategoryName: string;
  priceInCents: number;
  stock: number;
};

export type ImportPreview = {
  products: ImportedProductPreview[];
  skipped: { sourceProductId: number; reason: string }[];
};

const slugify = (value: string) => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

function getCredentials() {
  const email = process.env.CONTABILIDAD_SYNC_USERNAME;
  const password = process.env.CONTABILIDAD_SYNC_PASSWORD;
  if (!email || !password) throw new Error("Las credenciales de sincronización no están configuradas.");
  return { email, password };
}

async function fetchWithRetry(url: string, options?: RequestInit) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

function endpoint(procedure: string) {
  return `${SOURCE_URL}/api/trpc/${procedure}?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D`;
}

function extractCookie(response: globalThis.Response) {
  const multiple = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const raw = multiple.length ? multiple : [response.headers.get("set-cookie") ?? ""];
  const cookie = raw.map(value => value.split(";")[0]).filter(Boolean).join("; ");
  if (!cookie) throw new Error("Contabilidad no devolvió una sesión para la cuenta técnica.");
  return cookie;
}

async function sourceSession() {
  const { email, password } = getCredentials();
  const response = await fetchWithRetry(`${SOURCE_URL}/api/trpc/auth.login?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: { email, password } } }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || JSON.stringify(body).includes("error")) throw new Error("Contabilidad rechazó las credenciales de lectura.");
  return extractCookie(response);
}

async function sourceRead<T>(cookie: string, procedure: string): Promise<T> {
  const response = await fetchWithRetry(endpoint(procedure), { headers: { Cookie: cookie } });
  const payload = await response.json().catch(() => null) as Array<{ result?: { data?: { json?: T } } }> | null;
  const value = payload?.[0]?.result?.data?.json;
  if (!response.ok || value === undefined) throw new Error(`No se pudo leer ${procedure} desde contabilidad.`);
  return value;
}

export async function readContabilidadSnapshot() {
  const cookie = await sourceSession();
  const [purchases, inventory, sourceCategories] = await Promise.all([
    sourceRead<SourcePurchase[]>(cookie, "purchases.list"),
    sourceRead<SourceInventory[]>(cookie, "inventory.list"),
    sourceRead<SourceCategory[]>(cookie, "categories.list"),
  ]);
  return { purchases, inventory, sourceCategories };
}

export function buildImportPreview(snapshot: Awaited<ReturnType<typeof readContabilidadSnapshot>>): ImportPreview {
  const categoriesById = new Map(snapshot.sourceCategories.map(category => [category.id, category]));
  const inventoryByProductId = new Map(snapshot.inventory.map(row => [row.productId, row]));
  const latestReceivedPurchase = new Map<number, SourcePurchase>();

  for (const purchase of snapshot.purchases) {
    if (purchase.status.trim().toUpperCase() !== RECEIVED_STATUS) continue;
    const existing = latestReceivedPurchase.get(purchase.productId);
    if (!existing || new Date(purchase.purchaseDate).getTime() > new Date(existing.purchaseDate).getTime() || (purchase.purchaseDate === existing.purchaseDate && purchase.id > existing.id)) {
      latestReceivedPurchase.set(purchase.productId, purchase);
    }
  }

  const products: ImportedProductPreview[] = [];
  const skipped: ImportPreview["skipped"] = [];

  for (const [productId, purchase] of Array.from(latestReceivedPurchase.entries())) {
    const inventory = inventoryByProductId.get(productId);
    const sourceProduct = purchase.product;
    const sku = sourceProduct?.code?.trim() || inventory?.productCode?.trim();
    const name = sourceProduct?.name?.trim() || inventory?.productName?.trim();
    const suggestedPrice = Number(purchase.suggestedPrice);
    const categoryId = sourceProduct?.categoryId ?? inventory?.categoryId ?? null;

    if (!sku || !name) { skipped.push({ sourceProductId: productId, reason: "Sin código o nombre de producto." }); continue; }
    if (!Number.isFinite(suggestedPrice) || suggestedPrice <= 0) { skipped.push({ sourceProductId: productId, reason: "Sin precio sugerido válido." }); continue; }

    const sourceCategory = categoryId ? categoriesById.get(categoryId) : undefined;
    products.push({
      sourceProductId: productId,
      sku,
      slug: slugify(sku),
      name,
      sourceCategoryId: categoryId,
      sourceCategoryName: sourceCategory?.name?.trim() || "Sin categoría",
      priceInCents: Math.round(suggestedPrice * 100),
      stock: Math.max(0, Math.trunc(Number(inventory?.finalStock ?? 0) || 0)),
    });
  }

  return { products: products.sort((a, b) => a.sku.localeCompare(b.sku)), skipped };
}

async function categoryForImport(sourceCategory: ImportedProductPreview, categoriesBySlug: Map<string, { id: number }>) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const externalId = sourceCategory.sourceCategoryId ?? 0;
  const slug = `conta-${externalId}-${slugify(sourceCategory.sourceCategoryName) || "sin-categoria"}`.slice(0, 120);
  const existing = categoriesBySlug.get(slug) ?? categoriesBySlug.get(slugify(sourceCategory.sourceCategoryName));
  if (existing) return existing.id;
  const result = await db.insert(categories).values({
    name: sourceCategory.sourceCategoryName,
    slug,
    description: "Categoría importada desde contabilidad.",
    accentColor: "#D89542",
    isActive: true,
  });
  const id = Number(result[0].insertId);
  categoriesBySlug.set(slug, { id });
  categoriesBySlug.set(slugify(sourceCategory.sourceCategoryName), { id });
  return id;
}

export async function previewContabilidadImport() {
  return buildImportPreview(await readContabilidadSnapshot());
}

export async function runContabilidadImport(trigger: "manual" | "scheduled") {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const started = await db.insert(inventorySyncRuns).values({ trigger, status: "running" });
  const runId = Number(started[0].insertId);

  try {
    const preview = await previewContabilidadImport();
    const [existingProducts, existingCategories] = await Promise.all([
      db.select().from(products),
      db.select().from(categories),
    ]);
    const productsBySku = new Map(existingProducts.filter(product => product.sku).map(product => [product.sku!, product]));
    const productsBySlug = new Map(existingProducts.map(product => [product.slug, product]));
    const categoriesBySlug = new Map(existingCategories.flatMap(category => [[category.slug, { id: category.id }], [slugify(category.name), { id: category.id }]] as const));
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = preview.skipped.length;

    for (const incoming of preview.products) {
      const existingBySku = productsBySku.get(incoming.sku);
      const conflictingSlug = productsBySlug.get(incoming.slug);
      if (!existingBySku && conflictingSlug && conflictingSlug.sku !== incoming.sku) { skippedCount += 1; continue; }
      const categoryId = await categoryForImport(incoming, categoriesBySlug);

      if (existingBySku) {
        await db.update(products).set({
          categoryId,
          name: incoming.name,
          priceInCents: incoming.priceInCents,
          stock: incoming.stock,
        }).where(eq(products.id, existingBySku.id));
        updatedCount += 1;
      } else {
        const result = await db.insert(products).values({
          categoryId,
          name: incoming.name,
          slug: incoming.slug,
          sku: incoming.sku,
          shortDescription: "Producto importado desde contabilidad. Agrega fotografías y descripción antes de publicarlo.",
          description: `Código de inventario: ${incoming.sku}.`,
          priceInCents: incoming.priceInCents,
          stock: incoming.stock,
          status: "draft",
          isFeatured: false,
          isOffer: false,
          mainImageUrl: null,
        });
        const productId = Number(result[0].insertId);
        productsBySku.set(incoming.sku, { id: productId } as typeof existingProducts[number]);
        productsBySlug.set(incoming.slug, { id: productId } as typeof existingProducts[number]);
        createdCount += 1;
      }
    }

    await db.update(inventorySyncRuns).set({ status: "completed", createdCount, updatedCount, skippedCount, finishedAt: new Date() }).where(eq(inventorySyncRuns.id, runId));
    return { runId, createdCount, updatedCount, skippedCount, total: preview.products.length };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Error no identificado durante la sincronización.";
    await db.update(inventorySyncRuns).set({ status: "failed", errorMessage: message, finishedAt: new Date() }).where(eq(inventorySyncRuns.id, runId));
    throw error;
  }
}

export async function listContabilidadSyncRuns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventorySyncRuns).orderBy(desc(inventorySyncRuns.startedAt)).limit(10);
}

export async function getContabilidadSyncSettings() {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const [settings] = await db.select().from(inventorySyncSettings).orderBy(desc(inventorySyncSettings.id)).limit(1);
  return settings ?? null;
}

async function touchLastScheduledAt() {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const existing = await getContabilidadSyncSettings();
  if (existing) {
    await db.update(inventorySyncSettings).set({ lastScheduledAt: new Date() }).where(eq(inventorySyncSettings.id, existing.id));
  } else {
    await db.insert(inventorySyncSettings).values({ lastScheduledAt: new Date() });
  }
}

export async function runQuincenalContabilidadSync() {
  const result = await runContabilidadImport("scheduled");
  await touchLastScheduledAt();
  return result;
}
