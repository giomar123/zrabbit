import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("editor móvil de contenido y fotos", () => {
  const admin = readFileSync(resolve(process.cwd(), "client/src/pages/Admin.tsx"), "utf8");
  const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

  it("acepta HEIC, limita imágenes pesadas y muestra acciones claras", () => {
    expect(admin).toContain("image/heic");
    expect(admin).toContain("5 * 1024 * 1024");
    expect(admin).toContain("Subir foto");
    expect(admin).toContain("Publicar");
    expect(admin).toContain("Guardar cambios");
  });

  it("mantiene código, precio y stock fuera de la lista principal, pero dentro del editor", () => {
    const helper = readFileSync(resolve(process.cwd(), "client/src/components/AdminMobileEditorHelper.tsx"), "utf8");
    expect(helper).toContain(".min-w-170 th:nth-child(2)");
    expect(helper).toContain(".min-w-170 th:nth-child(3)");
    expect(helper).toContain(".min-w-170 th:nth-child(4)");
    expect(admin).toContain("Datos de contabilidad:");
  });

  it("no permite publicar contenido sin al menos una fotografía", () => {
    expect(router).toContain('Carga al menos una fotografía antes de publicar el producto.');
  });
});
