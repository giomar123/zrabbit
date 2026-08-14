import { describe, expect, it } from "vitest";
import { buildImportPreview, RAILWAY_QUINCENAL_SYNC_CRON } from "./contabilidadSync";

describe("mapeo de contabilidad a catálogo", () => {
  it("usa la última compra recibida, precio sugerido y stock final", () => {
    const preview = buildImportPreview({
      sourceCategories: [{ id: 1, name: "Pokémon" }],
      inventory: [{ productId: 7, productCode: "POK0000007", productName: "Eevee", categoryId: 1, finalStock: 4 }],
      purchases: [
        { id: 1, purchaseDate: "2026-06-01", productId: 7, quantity: 1, suggestedPrice: "55.00", status: "Recibido", product: { id: 7, code: "POK0000007", name: "Eevee", categoryId: 1 } },
        { id: 2, purchaseDate: "2026-06-10", productId: 7, quantity: 1, suggestedPrice: "65.00", status: "Recibido", product: { id: 7, code: "POK0000007", name: "Eevee", categoryId: 1 } },
        { id: 3, purchaseDate: "2026-06-15", productId: 8, quantity: 1, suggestedPrice: "70.00", status: "Pendiente", product: { id: 8, code: "POK0000008", name: "Vaporeon", categoryId: 1 } },
      ],
    });

    expect(preview.products).toEqual([expect.objectContaining({ sku: "POK0000007", slug: "pok0000007", priceInCents: 6500, stock: 4, sourceCategoryName: "Pokémon" })]);
    expect(preview.skipped).toEqual([]);
  });

  it("omite productos sin precio sugerido válido", () => {
    const preview = buildImportPreview({
      sourceCategories: [],
      inventory: [],
      purchases: [{ id: 1, purchaseDate: "2026-06-01", productId: 7, quantity: 1, suggestedPrice: null, status: "Recibido", product: { id: 7, code: "POK0000007", name: "Eevee", categoryId: null } }],
    });

    expect(preview.products).toEqual([]);
    expect(preview.skipped).toEqual([{ sourceProductId: 7, reason: "Sin precio sugerido válido." }]);
  });

  it("programa la sincronización quincenal a las 09:00 de Perú", () => {
    expect(RAILWAY_QUINCENAL_SYNC_CRON).toBe("0 14 1,16 * *");
  });
});
