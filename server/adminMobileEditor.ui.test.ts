import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("editor móvil de productos", () => {
  it("usa un objetivo táctil amplio y abre una configuración móvil cerrable", () => {
    const source = readFileSync(new URL("../client/src/pages/Admin.tsx", import.meta.url), "utf8");
    const helper = readFileSync(new URL("../client/src/components/AdminMobileEditorHelper.tsx", import.meta.url), "utf8");
    expect(helper).toContain("min-width:44px");
    expect(helper).toContain("product-content-editor");
    expect(helper).toContain("mobileProductEditor");
    expect(helper).toContain("order:-1");
    expect(helper).not.toContain("position:fixed!important");
    expect(helper).toContain("Cerrar configuración");
    expect(helper).not.toContain("openPhotoPicker");
    expect(helper).not.toContain('input[type="file"].hidden');
    expect(helper).not.toContain("nativeFileInputStyle");
    expect(helper).not.toContain(":has(");
    expect(source).toContain('className="absolute inset-0 z-10 block h-full w-full cursor-pointer opacity-0"');
    expect(source).toContain("const input = event.currentTarget");
    expect(source).toContain('finally { input.value = ""; }');
    expect(source).toContain('id="product-content-editor"');
    expect(source).toContain("zrabbit:close-product-editor");
    expect(source).toContain("Editar contenido de");
  });
});
