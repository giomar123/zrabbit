import { describe, expect, it } from "vitest";

const shouldRun = process.env.RUN_CONTABILIDAD_SALES_TEST === "true";
const username = process.env.CONTABILIDAD_SALES_USERNAME;
const password = process.env.CONTABILIDAD_SALES_PASSWORD;
const authMeUrl = "https://contabilidad.zrabbit.shop/api/trpc/auth.me?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D";
const productsUrl = "https://contabilidad.zrabbit.shop/api/trpc/products.list,inventory.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%2C%221%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D";

describe("cuenta técnica de Ventas de contabilidad", () => {
  it.skipIf(!shouldRun)("autentica la cuenta técnica sin crear una venta", async () => {
    expect(username).toBeTruthy();
    expect(password).toBeTruthy();

    const login = await fetch("https://contabilidad.zrabbit.shop/api/trpc/auth.login?batch=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { email: username, password } } }),
    });
    const loginPayload = await login.json();
    const cookie = login.headers.get("set-cookie");

    expect(login.ok).toBe(true);
    expect(JSON.stringify(loginPayload)).not.toContain("error");
    expect(cookie).toBeTruthy();

    const identity = await fetch(authMeUrl, { headers: { Cookie: cookie!.split(";")[0] } });
    const identityPayload = await identity.json();

    expect(identity.ok).toBe(true);
    expect(JSON.stringify(identityPayload)).not.toContain("UNAUTHORIZED");

    const sourceData = await fetch(productsUrl, { headers: { Cookie: cookie!.split(";")[0] } });
    const sourcePayload = await sourceData.json();
    expect(sourceData.ok).toBe(true);
    expect(JSON.stringify(sourcePayload)).not.toContain("UNAUTHORIZED");
  }, 20_000);
});
