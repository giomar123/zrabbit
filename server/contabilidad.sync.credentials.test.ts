import { describe, expect, it } from "vitest";
import { previewContabilidadImport, runContabilidadImport } from "./contabilidadSync";

const shouldRun = process.env.RUN_CONTABILIDAD_SYNC_TEST === "true";
const username = process.env.CONTABILIDAD_SYNC_USERNAME;
const password = process.env.CONTABILIDAD_SYNC_PASSWORD;
const inventoryUrl = "https://contabilidad.zrabbit.shop/api/trpc/inventory.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D";

async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw lastError;
}

describe("cuenta técnica de contabilidad", () => {
  it.skipIf(!shouldRun)("valida las credenciales de lectura contra el acceso de contabilidad", async () => {
    expect(username).toBeTruthy();
    expect(password).toBeTruthy();

    const response = await fetchWithRetry("https://contabilidad.zrabbit.shop/api/trpc/auth.login?batch=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "0": {
          json: {
            email: username,
            password,
          },
        },
      }),
    });

    const payload = await response.json();
    const serialized = JSON.stringify(payload);

    expect(response.ok).toBe(true);
    expect(serialized).not.toContain("error");

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    const inventoryResponse = await fetchWithRetry(inventoryUrl, {
      headers: { Cookie: setCookie!.split(";")[0] },
    });
    const inventoryPayload = await inventoryResponse.json();

    expect(inventoryResponse.ok).toBe(true);
    expect(JSON.stringify(inventoryPayload)).not.toContain("UNAUTHORIZED");
  }, 20_000);

  it.skipIf(!shouldRun)("genera una vista previa sin modificar productos", async () => {
    const preview = await previewContabilidadImport();
    expect(preview.products.length).toBeGreaterThan(0);
    expect(preview.products.every(product => product.sku && product.priceInCents > 0 && product.stock >= 0)).toBe(true);
  }, 20_000);

  it.skipIf(process.env.RUN_CONTABILIDAD_IMPORT_TEST !== "true")("importa productos externos como borradores sin imágenes", async () => {
    const result = await runContabilidadImport("manual");
    expect(result.total).toBeGreaterThan(0);
    expect(result.createdCount + result.updatedCount).toBeGreaterThan(0);
  }, 45_000);
});
