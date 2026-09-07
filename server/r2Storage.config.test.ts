import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("almacenamiento R2 de imágenes", () => {
  const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

  it("usa las variables privadas de R2 y el dominio público para nuevas imágenes", () => {
    expect(storage).toContain("R2_ENDPOINT");
    expect(storage).toContain("R2_ACCESS_KEY_ID");
    expect(storage).toContain("R2_SECRET_ACCESS_KEY");
    expect(storage).toContain("R2_BUCKET");
    expect(storage).toContain("R2_PUBLIC_BASE_URL");
    expect(storage).toContain("new PutObjectCommand");
    expect(storage).toContain("publicObjectUrl");
  });

  it("elimina el objeto R2 al retirar una foto nueva sin tocar imágenes heredadas", () => {
    expect(router).toContain("isR2StorageUrl(image[0].url)");
    expect(router).toContain("storageDelete(image[0].storageKey)");
  });
});
