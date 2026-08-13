import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL_AUSENTE");
  process.exit(1);
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [columns] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    ["orders", "isFreeShipping"],
  );
  if (!Array.isArray(columns) || columns.length === 0) {
    await connection.execute("ALTER TABLE orders ADD COLUMN isFreeShipping BOOLEAN NOT NULL DEFAULT FALSE");
  }
  console.log("CHECKOUT_SHIPPING_REPARADO");
} finally {
  connection.destroy();
}
