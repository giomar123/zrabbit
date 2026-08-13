import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function editorContext(): TrpcContext {
  return {
    user: { id: 991, openId: "editor-test", name: "Editor", email: "editor@example.com", loginMethod: "google", role: "editor", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("perfil Editor de productos", () => {
  it("puede consultar categorías, imágenes y operaciones de inventario del catálogo", async () => {
    const caller = appRouter.createCaller(editorContext());
    await expect(caller.admin.categories.list()).resolves.toBeInstanceOf(Array);
    await expect(caller.admin.images.list({ productId: 2147483000 })).resolves.toBeInstanceOf(Array);
    await expect(caller.admin.products.updateStock({ id: 2147483000, stock: 7 })).resolves.toEqual({ success: true });
    await expect(caller.admin.products.archive({ id: 2147483000 })).resolves.toEqual({ success: true });
  });

  it("puede editar el precio de un producto real", async () => {
    const caller = appRouter.createCaller(editorContext());
    const catalog = await caller.admin.products.list();
    const target = catalog[0]!; const original = target.product;
    const updatedPrice = original.priceInCents + 1;
    try {
      await caller.admin.products.save({ id: original.id, categoryId: original.categoryId, name: original.name, slug: original.slug, sku: original.sku ?? undefined, shortDescription: original.shortDescription, description: original.description ?? undefined, priceInCents: updatedPrice, compareAtPriceInCents: original.compareAtPriceInCents, stock: original.stock, status: original.status, isFeatured: original.isFeatured, isOffer: original.isOffer, mainImageUrl: null, metaTitle: original.metaTitle ?? undefined, metaDescription: original.metaDescription ?? undefined });
      const changed = (await caller.admin.products.list()).find(item => item.product.id === original.id)!.product;
      expect(changed.priceInCents).toBe(updatedPrice);
    } finally {
      await caller.admin.products.save({ id: original.id, categoryId: original.categoryId, name: original.name, slug: original.slug, sku: original.sku ?? undefined, shortDescription: original.shortDescription, description: original.description ?? undefined, priceInCents: original.priceInCents, compareAtPriceInCents: original.compareAtPriceInCents, stock: original.stock, status: original.status, isFeatured: original.isFeatured, isOffer: original.isOffer, mainImageUrl: null, metaTitle: original.metaTitle ?? undefined, metaDescription: original.metaDescription ?? undefined });
    }
  });

  it("puede crear un producto con precio y archivarlo al terminar", async () => {
    const caller = appRouter.createCaller(editorContext()); const category = (await caller.admin.categories.list())[0]!; const slug = `editor-test-${Date.now()}`;
    const created = await caller.admin.products.save({ categoryId: category.id, name: "Prueba temporal de editor", slug, shortDescription: "Producto de prueba temporal", priceInCents: 12345, stock: 1, status: "draft", isFeatured: false, isOffer: false, mainImageUrl: null });
    try {
      const saved = (await caller.admin.products.list()).find(item => item.product.id === created.id)?.product;
      expect(saved).toMatchObject({ id: created.id, slug, priceInCents: 12345, status: "draft" });
    } finally {
      await caller.admin.products.archive({ id: created.id });
      const archived = (await caller.admin.products.list()).find(item => item.product.id === created.id)?.product;
      expect(archived?.status).toBe("archived");
    }
  });

  it("no puede gestionar usuarios, pedidos ni la lista de Gmail", async () => {
    const caller = appRouter.createCaller(editorContext());
    await expect(caller.admin.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.orders.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.googleAccess.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
