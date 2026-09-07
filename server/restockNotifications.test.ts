import { describe, expect, it } from "vitest";
import { restockNotificationInternals } from "./restockNotifications";

describe("avisos de reposición", () => {
  it("construye un aviso específico del producto y escapa texto inseguro", () => {
    const email = restockNotificationInternals.restockEmail({ id: 9, name: "Figura <especial>", slug: "pok0000009", priceInCents: 9500 });
    expect(email.subject).toContain("volvió a estar disponible");
    expect(email.html).toContain("Figura &lt;especial&gt;");
    expect(email.html).toContain("https://zrabbit.shop/productos/pok0000009");
    expect(email.text).toContain("S/ 95.00");
  });

  it("mantiene el enlace de producto limitado al slug", () => {
    expect(restockNotificationInternals.productUrl("dbz0000018")).toBe("https://zrabbit.shop/productos/dbz0000018");
  });
});
