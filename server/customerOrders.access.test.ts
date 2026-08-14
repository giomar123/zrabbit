import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { authenticateGoogleCustomer, GOOGLE_CUSTOMER_SESSION_COOKIE } from "./_core/googleAuth";

function contextForCustomer(customer: TrpcContext["customer"]): TrpcContext {
  return { user: null, customer, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("customer orders access", () => {
  it("acepta una sesión Google de cliente firmada y conserva solo su identidad", async () => {
    const key = new TextEncoder().encode(process.env.JWT_SECRET!);
    const token = await new SignJWT({ kind: "google_customer", email: "comprador@example.com", name: "Comprador" }).setProtectedHeader({ alg: "HS256" }).setSubject("google:comprador").setIssuedAt().setExpirationTime("12h").sign(key);
    const customer = await authenticateGoogleCustomer({ headers: { cookie: `${GOOGLE_CUSTOMER_SESSION_COOKIE}=${token}` } } as never);
    expect(customer).toEqual({ email: "comprador@example.com", name: "Comprador", openId: "google:comprador" });
  });

  it("rechaza la lectura de pedidos sin una sesión de cliente", async () => {
    const caller = appRouter.createCaller(contextForCustomer(null));
    await expect(caller.customer.orders()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("expone el correo de la sesión de cliente, no su dirección ni su teléfono", async () => {
    const caller = appRouter.createCaller(contextForCustomer({ email: "comprador@example.com", name: "Comprador", openId: "google:comprador" }));
    await expect(caller.customer.me()).resolves.toEqual({ email: "comprador@example.com", name: "Comprador", openId: "google:comprador" });
  });
});
