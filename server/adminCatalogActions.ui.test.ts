import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const componentPath = path.resolve(import.meta.dirname, "../client/src/components/AdminCatalogActions.tsx");
const component = readFileSync(componentPath, "utf8");

describe("control minimizable de catálogo", () => {
  it("inicia compacto y conserva controles accesibles para expandir y minimizar", () => {
    expect(component).toContain('const [isExpanded, setIsExpanded] = useState(false)');
    expect(component).toContain('aria-label="Minimizar control de catálogo"');
    expect(component).toContain('aria-controls="catalog-control-panel"');
    expect(component).toContain("Catálogo");
  });
});
