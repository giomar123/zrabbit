import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./storage", () => ({ storagePut: vi.fn().mockResolvedValue({ key: "tests/editor-image.png", url: "https://example.com/editor-image.png" }) }));
const { appRouter } = await import("./routers");

function editorContext(): TrpcContext {
  return { user: { id: 992, openId: "editor-image-test", name: "Editor", email: "editor-image@example.com", loginMethod: "google", role: "editor", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("imágenes del perfil Editor", () => {
  it("puede cargar y retirar una imagen de producto", async () => {
    const caller = appRouter.createCaller(editorContext()); const product = (await caller.admin.products.list())[0]!.product;
    const uploaded = await caller.admin.images.upload({ productId: product.id, filename: "editor-test.png", contentType: "image/png", dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+KHEMfQAAAABJRU5ErkJggg==", altText: "Imagen temporal editor" });
    expect(uploaded.url).toBe("https://example.com/editor-image.png");
    expect((await caller.admin.images.list({ productId: product.id })).some(image => image.id === uploaded.id)).toBe(true);
    await caller.admin.images.remove({ id: uploaded.id });
    expect((await caller.admin.images.list({ productId: product.id })).some(image => image.id === uploaded.id)).toBe(false);
  });
});
