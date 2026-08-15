import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";

describe("persistencia y selector de cuentas Google", () => {
  it("usa cookies Lax detrás del proxy y no fija un correo de Google", () => {
    const cookies = readFileSync(new URL("./_core/cookies.ts", import.meta.url), "utf8");
    const bootstrap = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    const auth = readFileSync(new URL("./_core/googleAuth.ts", import.meta.url), "utf8");
    expect(cookies).toContain('sameSite: "lax"');
    expect(bootstrap).toContain('app.set("trust proxy", 1)');
    expect(auth).toContain('prompt: "select_account"');
    expect(auth).not.toContain('params.set("login_hint"');
  });

  it("conserva una cookie segura Lax cuando Railway informa HTTPS por proxy", () => {
    const options = getSessionCookieOptions({ protocol: "http", headers: { "x-forwarded-proto": "https" } } as any);
    expect(options).toMatchObject({ httpOnly: true, path: "/", sameSite: "lax", secure: true });
  });
});
