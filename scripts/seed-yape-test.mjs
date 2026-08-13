import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const categorySlug = "pruebas-yape";
  const productSlug = "prueba-yape-s10";
  const [[category]] = await connection.execute("SELECT id FROM categories WHERE slug = ? LIMIT 1", [categorySlug]);
  let categoryId = category?.id;
  if (!categoryId) {
    const [result] = await connection.execute(
      "INSERT INTO categories (name, slug, description, accentColor, isActive) VALUES (?, ?, ?, ?, ?)",
      ["Pruebas de pago", categorySlug, "Categoría privada para validar métodos de pago.", "#D89542", false],
    );
    categoryId = result.insertId;
  }

  const [[product]] = await connection.execute("SELECT id FROM products WHERE slug = ? LIMIT 1", [productSlug]);
  if (!product) {
    await connection.execute(
      "INSERT INTO products (categoryId, name, slug, sku, shortDescription, description, priceInCents, stock, status, isFeatured, isOffer, metaTitle, metaDescription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [categoryId, "Prueba de pago Yape", productSlug, "YAPE-TEST-001", "Producto privado de S/ 10 para validar Yape.", "Producto de prueba interno. No se envía ni está disponible en el catálogo público.", 1_000, 25, "active", false, false, "Prueba Yape | zRabbit", "Producto interno de prueba para el flujo de pago Yape."],
    );
  }
  console.log("PRODUCTO_PRUEBA_YAPE_LISTO");
} finally {
  connection.destroy();
}
