import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL_AUSENTE");
  process.exit(1);
}

const connection = await mysql.createConnection(databaseUrl);
try {
  await connection.execute(`CREATE TABLE IF NOT EXISTS inventorySyncRuns (
    id int AUTO_INCREMENT NOT NULL,
    \`trigger\` enum('manual','scheduled') NOT NULL,
    status enum('running','completed','failed') NOT NULL DEFAULT 'running',
    createdCount int NOT NULL DEFAULT 0,
    updatedCount int NOT NULL DEFAULT 0,
    skippedCount int NOT NULL DEFAULT 0,
    errorMessage varchar(500),
    startedAt timestamp NOT NULL DEFAULT (now()),
    finishedAt timestamp,
    PRIMARY KEY (id),
    KEY inventory_sync_runs_started_idx (startedAt)
  )`);
  await connection.execute(`CREATE TABLE IF NOT EXISTS inventorySyncSettings (
    id int AUTO_INCREMENT NOT NULL,
    scheduleCronTaskUid varchar(65),
    lastScheduledAt timestamp,
    createdAt timestamp NOT NULL DEFAULT (now()),
    updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY inventorySyncSettings_scheduleCronTaskUid_unique (scheduleCronTaskUid)
  )`);
  console.log("SINCRONIZACION_ESQUEMA_LISTO");
} finally {
  await connection.end();
}

process.exit(0);
