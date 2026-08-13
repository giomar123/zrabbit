import { afterEach, describe, expect, it, vi } from "vitest";
import { isGoogleAuthConfigured } from "./_core/googleAuth";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const keys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_ADMIN_EMAIL", "GOOGLE_OAUTH_REDIRECT_URI", "JWT_SECRET"] as const;
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  vi.unstubAllEnvs();
});

describe("configuración Google OAuth", () => {
  it("requiere las cinco variables privadas antes de habilitar el acceso", () => {
    for (const key of keys) vi.stubEnv(key, "");
    expect(isGoogleAuthConfigured()).toBe(false);
    vi.stubEnv("GOOGLE_CLIENT_ID", "client.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubEnv("GOOGLE_ADMIN_EMAIL", "admin@gmail.com");
    vi.stubEnv("GOOGLE_OAUTH_REDIRECT_URI", "https://zrabbit.shop/api/auth/google/callback");
    vi.stubEnv("JWT_SECRET", "session-secret");
    expect(isGoogleAuthConfigured()).toBe(true);
  });

  it("expone configuración activa mediante el procedimiento de estado", async () => {
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const status = await caller.auth.googleStatus();
    expect(process.env.GOOGLE_CLIENT_ID).toBeTruthy();
    expect(process.env.GOOGLE_CLIENT_SECRET).toBeTruthy();
    expect(process.env.GOOGLE_ADMIN_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(status.configured).toBe(true);
  });
});
