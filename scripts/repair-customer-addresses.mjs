import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL_AUSENTE");
  process.exit(1);
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);

async function hasIndex(name) {
  const [rows] = await connection.execute(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
    ["customerAddresses", name],
  );
  return Array.isArray(rows) && rows.length > 0;
}

try {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS customerAddresses (
      id INT AUTO_INCREMENT NOT NULL,
      customerEmail VARCHAR(320) NOT NULL,
      label VARCHAR(80) NOT NULL,
      recipientName VARCHAR(160) NOT NULL,
      phone VARCHAR(40),
      address TEXT NOT NULL,
      district VARCHAR(120) NOT NULL,
      isDefault BOOLEAN NOT NULL DEFAULT FALSE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  if (!await hasIndex("customer_addresses_email_idx")) {
    await connection.execute("CREATE INDEX customer_addresses_email_idx ON customerAddresses (customerEmail)");
  }
  if (!await hasIndex("customer_addresses_default_idx")) {
    await connection.execute("CREATE INDEX customer_addresses_default_idx ON customerAddresses (customerEmail, isDefault)");
  }
  console.log("DIRECCIONES_CLIENTE_LISTAS");
} finally {
  connection.destroy();
}
