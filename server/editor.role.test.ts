import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function editorContext(): TrpcContext {
  return {
    user: { id: 991, openId: "editor-test", name: "Editor", email: "editor@example.com", loginMethod: "google", role: "editor", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"],
  };
}

describe("perfil Editor de contenido", () => {
  it("puede consultar catálogo, imágenes y archivar una publicación sin modificar inventario", async () => {
    const caller = appRouter.createCaller(editorContext());
    await expect(caller.admin.categories.list()).resolves.toBeInstanceOf(Array);
    await expect(caller.admin.images.list({ productId: 2147483000 })).resolves.toBeInstanceOf(Array);
    await expect(caller.admin.products.updateStock({ id: 2147483000, stock: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.products.archive({ id: 2147483000 })).resolves.toEqual({ success: true });
  });

  it("solo guarda contenido comercial y conserva precio, stock y código de contabilidad", async () => {
    const caller = appRouter.createCaller(editorContext());
    const catalog = await caller.admin.products.list();
    const target = catalog[0]!; const original = target.product;
    const originalDescription = original.description;
    try {
      await caller.admin.products.save({ id: original.id, categoryId: original.categoryId, name: `${original.name} no debe cambiar`, slug: original.slug, sku: "NO-DEBE-CAMBIAR", shortDescription: "Contenido comercial actualizado para la prueba", description: "Descripción editada temporalmente.", priceInCents: original.priceInCents + 1, compareAtPriceInCents: original.compareAtPriceInCents, stock: original.stock + 9, status: original.status, isFeatured: original.isFeatured, isOffer: original.isOffer, mainImageUrl: null });
      const changed = (await caller.admin.products.list()).find(item => item.product.id === original.id)!.product;
      expect(changed).toMatchObject({ name: original.name, sku: original.sku, priceInCents: original.priceInCents, stock: original.stock, shortDescription: "Contenido comercial actualizado para la prueba" });
    } finally {
      await caller.admin.products.save({ id: original.id, categoryId: original.categoryId, name: original.name, slug: original.slug, sku: original.sku ?? undefined, shortDescription: original.shortDescription, description: originalDescription ?? undefined, priceInCents: original.priceInCents, compareAtPriceInCents: original.compareAtPriceInCents, stock: original.stock, status: original.status, isFeatured: original.isFeatured, isOffer: original.isOffer, mainImageUrl: null });
    }
  });

  it("rechaza crear un producto local fuera de contabilidad", async () => {
    const caller = appRouter.createCaller(editorContext());
    const create = caller.admin.products.save as unknown as (input: Record<string, unknown>) => Promise<unknown>;
    await expect(create({ categoryId: 1, name: "No permitido", slug: "no-permitido", shortDescription: "No se puede crear localmente", priceInCents: 100, stock: 1, status: "draft", isFeatured: false, isOffer: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("no puede gestionar usuarios, pedidos ni la lista de Gmail", async () => {
    const caller = appRouter.createCaller(editorContext());
    await expect(caller.admin.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.orders.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.googleAccess.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
