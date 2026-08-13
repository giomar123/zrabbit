import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "user" | "admin" | null): TrpcContext {
  return {
    user: role ? { id: 1, openId: "test-user", name: "Test", email: "test@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("administración protegida", () => {
  it("rechaza a visitantes sin sesión", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.admin.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rechaza a usuarios autenticados sin el rol administrador", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.products.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("protege también la lista de imágenes de producto", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.images.list({ productId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
