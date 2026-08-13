import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL_AUSENTE");
  process.exit(1);
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS isFreeShipping BOOLEAN NOT NULL DEFAULT FALSE");
  console.log("CHECKOUT_SHIPPING_REPARADO");
} finally {
  connection.destroy();
}
