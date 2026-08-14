import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("página Mis pedidos", () => {
  it("explica el acceso con el mismo Gmail y dirige al login de cliente", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/MyOrders.tsx"), "utf8");
    expect(page).toContain("/api/auth/customer/google/login");
    expect(page).toContain("misma cuenta Gmail");
    expect(page).toContain("No creamos una contraseña nueva");
  });
});
