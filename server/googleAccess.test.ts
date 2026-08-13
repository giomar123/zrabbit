import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { authenticateGoogleAdmin, GOOGLE_SESSION_COOKIE } from "./_core/googleAuth";

function contextFor(role: "user" | "admin"): TrpcContext {
  return {
    user: { id: 999991, openId: `test-${role}`, name: "Test", email: `${role}@example.com`, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin.googleAccess", () => {
  it("rechaza a usuarios sin rol administrador", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.googleAccess.add({ email: "access-test@example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite agregar y retirar un Gmail autorizado", async () => {
    const email = "access-test@example.com";
    const caller = appRouter.createCaller(contextFor("admin"));
    await caller.admin.googleAccess.add({ email });
    const entries = await caller.admin.googleAccess.list();
    const entry = entries.find(item => item.email === email);
    expect(entry).toBeTruthy();
    await caller.admin.googleAccess.remove({ id: entry!.id });
    const remaining = await caller.admin.googleAccess.list();
    expect(remaining.find(item => item.email === email)).toBeUndefined();
  });

  it("rechaza una sesión firmada de un Gmail que no figura en la lista", async () => {
    const key = new TextEncoder().encode(process.env.JWT_SECRET!);
    const token = await new SignJWT({ kind: "google_admin", email: "no-autorizado@example.com" }).setProtectedHeader({ alg: "HS256" }).setSubject("google:no-autorizado").setIssuedAt().setExpirationTime("12h").sign(key);
    const user = await authenticateGoogleAdmin({ headers: { cookie: `${GOOGLE_SESSION_COOKIE}=${token}` } } as never);
    expect(user).toBeNull();
  });
});
