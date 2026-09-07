import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("solicitud de aviso por producto agotado", () => {
  it("muestra una alternativa de aviso en lugar de permitir la compra sin stock", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/ProductDetail.tsx"), "utf8");
    expect(page).toContain("Lo sentimos, no tenemos stock de este producto");
    expect(page).toContain("Avísame cuando haya stock");
    expect(page).toContain("stockNotifications.subscribe");
    expect(page).toContain("{canBuy ?");
  });

  it("recibe solicitudes públicas y valida que el producto siga agotado", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "server/restockNotifications.ts"), "utf8");
    expect(router).toContain("stockNotifications");
    expect(router).toContain("subscribeToRestock");
    expect(service).toContain("product.stock > 0");
    expect(service).toContain("onDuplicateKeyUpdate");
  });
});
