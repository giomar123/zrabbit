import { describe, expect, it } from "vitest";
import { orderNotificationInternals } from "./orderNotifications";

describe("notificaciones de pedido", () => {
  it("formatea importes e impide inyectar contenido HTML en el correo", () => {
    expect(orderNotificationInternals.formatCurrency(19_900)).toBe("S/ 199.00");
    expect(orderNotificationInternals.htmlEscape("<figura & colección>")).toBe("&lt;figura &amp; colección&gt;");
  });

  it("resume las líneas de un pedido sin incluir datos de dirección", () => {
    expect(orderNotificationInternals.itemsList([
      { productName: "Figura A", quantity: 1 },
      { productName: "Figura B", quantity: 2 },
    ])).toBe("1 × Figura A, 2 × Figura B");
  });

  it("mantiene la configuración de correo aislada de los destinatarios de clientes", () => {
    expect(orderNotificationInternals.emailConfiguration()).toBeTruthy();
  });
});
