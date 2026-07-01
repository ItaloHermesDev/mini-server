import { loadEnvConfig } from "@next/env";
import mysql from "mysql2/promise";

loadEnvConfig(process.cwd());

const config = {
  host: process.env.DB_HOST?.trim() || "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER?.trim(),
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME?.trim(),
};

console.log("Testando conexão...");
console.log("Host:", config.host);
console.log("Database:", config.database);
console.log("User:", config.user || "(vazio)");

try {
  const connection = await mysql.createConnection(config);
  await connection.execute("SELECT 1");
  const [rows] = await connection.execute(
    "SELECT COUNT(*) AS total FROM webhook_events"
  );
  await connection.end();

  console.log("Conexão OK");
  console.log("Registros em webhook_events:", rows[0]?.total ?? 0);
} catch (error) {
  console.error("Falha:", error instanceof Error ? error.message : error);
  process.exit(1);
}
