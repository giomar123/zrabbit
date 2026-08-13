import mysql from "mysql2/promise";

const required = ["DATABASE_URL"];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required.`);

const assets = {
  frontal: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663213950878/FkpVOszmcSjBOZLO.jpeg",
  caja: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663213950878/xEYkqIekhMTsPDtM.jpeg",
  posterior: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663213950878/jcweyYyMcHZKNtSr.jpeg",
};

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [[category]] = await connection.execute("SELECT id FROM categories WHERE slug = ? LIMIT 1", ["pokemon"]);
  let categoryId = category?.id;
  if (!categoryId) {
    const [result] = await connection.execute("INSERT INTO categories (name, slug, description, accentColor, isActive) VALUES (?, ?, ?, ?, ?)", ["Pokémon", "pokemon", "Figuras y ediciones de colección inspiradas en Pokémon.", "#D89542", true]);
    categoryId = result.insertId;
  }

  const [[existingProduct]] = await connection.execute("SELECT id, mainImageUrl FROM products WHERE slug = ? LIMIT 1", ["pikachu-select-serie-11"]);
  let productId = existingProduct?.id;
  if (!productId) {
    const [result] = await connection.execute(
      "INSERT INTO products (categoryId, name, slug, sku, shortDescription, description, priceInCents, compareAtPriceInCents, stock, status, isFeatured, isOffer, mainImageUrl, metaTitle, metaDescription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [categoryId, "Pikachu Select — Serie 11", "pikachu-select-serie-11", "PKW4424-121924-TN", "Figura Pikachu Select con caja original de la Serie 11.", "Figura Pikachu Select de la Serie 11. Incluye su empaque original y es ideal para exhibir en una colección.", 9500, null, 3, "active", true, false, assets.frontal, "Pikachu Select — Serie 11 | zRabbit", "Figura Pikachu Select Serie 11 con caja original. Disponible en zRabbit por S/ 95."],
    );
    productId = result.insertId;
  }

  const images = [
    [assets.frontal, "Pikachu Select Serie 11 — vista frontal", "seed/pikachu-select-frontal.jpeg", true],
    [assets.caja, "Pikachu Select Serie 11 — lateral de la caja", "seed/pikachu-select-caja.jpeg", false],
    [assets.posterior, "Pikachu Select Serie 11 — reverso de la caja", "seed/pikachu-select-posterior.jpeg", false],
  ];
  for (const [url, altText, storageKey, isPrimary] of images) {
    const [[existingImage]] = await connection.execute("SELECT id FROM productImages WHERE productId = ? AND url = ? LIMIT 1", [productId, url]);
    if (!existingImage) await connection.execute("INSERT INTO productImages (productId, storageKey, url, altText, sortOrder, isPrimary) VALUES (?, ?, ?, ?, ?, ?)", [productId, storageKey, url, altText, images.findIndex(image => image[0] === url), isPrimary]);
  }
  await connection.execute("UPDATE products SET mainImageUrl = COALESCE(mainImageUrl, ?) WHERE id = ?", [assets.frontal, productId]);
  console.log("Carga inicial completada: categoría Pokémon y Pikachu Select — Serie 11.");
} finally {
  await connection.end();
}
