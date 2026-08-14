import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextForCustomer(customer: TrpcContext["customer"]): TrpcContext {
  return { user: null, customer, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("customer addresses access", () => {
  it("rechaza consultar o modificar direcciones sin sesión de cliente", async () => {
    const caller = appRouter.createCaller(contextForCustomer(null));
    await expect(caller.customer.addresses.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.customer.addresses.save({ label: "Casa", recipientName: "Comprador", phone: "999999999", address: "Av. Siempre Viva 123", district: "Lima", isDefault: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
