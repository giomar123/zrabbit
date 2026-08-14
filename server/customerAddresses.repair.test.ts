import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("reparador de direcciones de clientes", () => {
  it("crea solo la tabla e índices de direcciones de forma idempotente", () => {
    const script = readFileSync(resolve(process.cwd(), "scripts/repair-customer-addresses.mjs"), "utf8");
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(script).toContain("CREATE TABLE IF NOT EXISTS customerAddresses");
    expect(script).toContain("customer_addresses_default_idx");
    expect(script).not.toContain("shippingMethod");
    expect(packageJson).toContain('"repair:addresses": "node scripts/repair-customer-addresses.mjs"');
  });
});
