import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL_AUSENTE");
  process.exit(1);
}

const columns = [
  ["shippingAgencyName", "varchar(180)"],
  ["shippingAgencyAddress", "varchar(300)"],
];

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const [name, definition] of columns) {
    const [existing] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      ["orders", name],
    );
    if (!Array.isArray(existing) || existing.length === 0) {
      await connection.execute(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
    }
  }
  console.log("AGENCIA_SHALOM_LISTA");
} finally {
  connection.destroy();
}
