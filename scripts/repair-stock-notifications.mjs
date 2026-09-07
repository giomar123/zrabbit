import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL_AUSENTE");
  process.exit(1);
}

const connection = await mysql.createConnection(databaseUrl);

async function hasIndex(name) {
  const [rows] = await connection.execute(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
    ["stockNotifications", name],
  );
  return Array.isArray(rows) && rows.length > 0;
}

try {
  await connection.execute(`CREATE TABLE IF NOT EXISTS stockNotifications (
    id INT AUTO_INCREMENT NOT NULL,
    productId INT NOT NULL,
    email VARCHAR(320) NOT NULL,
    status ENUM('pending', 'sent') NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notifiedAt TIMESTAMP NULL,
    PRIMARY KEY (id)
  )`);
  if (!await hasIndex("stock_notifications_product_idx")) {
    await connection.execute("CREATE INDEX stock_notifications_product_idx ON stockNotifications (productId, status)");
  }
  if (!await hasIndex("stock_notifications_product_email_uq")) {
    await connection.execute("CREATE UNIQUE INDEX stock_notifications_product_email_uq ON stockNotifications (productId, email)");
  }
  console.log("AVISOS_REPOSICION_LISTOS");
} finally {
  await connection.end();
}
