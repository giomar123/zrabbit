import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("editor móvil de productos", () => {
  it("usa un objetivo táctil amplio y desplaza al administrador al editor seleccionado", () => {
    const source = readFileSync(new URL("../client/src/pages/Admin.tsx", import.meta.url), "utf8");
    const helper = readFileSync(new URL("../client/src/components/AdminMobileEditorHelper.tsx", import.meta.url), "utf8");
    expect(helper).toContain("min-width:44px");
    expect(helper).toContain("product-content-editor");
    expect(helper).toContain("scrollIntoView");
    expect(source).toContain("Editar contenido de");
  });
});
