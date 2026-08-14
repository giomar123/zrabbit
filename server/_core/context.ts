import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateGoogleAdmin, authenticateGoogleCustomer, type GoogleCustomerIdentity } from "./googleAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  customer?: GoogleCustomerIdentity | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  user = await authenticateGoogleAdmin(opts.req);
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  const customer = await authenticateGoogleCustomer(opts.req);
  return {
    req: opts.req,
    res: opts.res,
    user,
    customer,
  };
}
