import { loadEnvConfig } from "@next/env";
import mysql from "mysql2/promise";

loadEnvConfig(process.cwd());

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

let pool: mysql.Pool | null = null;

function getDbConfig(): DbConfig {
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME?.trim();

  if (!user || password === undefined || password === "" || !database) {
    throw new Error(
      "Credenciais do banco não configuradas. Crie o arquivo .env.local na raiz do projeto e reinicie o servidor (npm run dev)."
    );
  }

  return {
    host: process.env.DB_HOST?.trim() || "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user,
    password,
    database,
  };
}

export function getPool(): mysql.Pool {
  if (!pool) {
    const config = getDbConfig();

    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return pool;
}

export async function ensureWebhookTable(): Promise<void> {
  const db = getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      payload JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function saveWebhookPayload(payload: unknown): Promise<number> {
  await ensureWebhookTable();

  const db = getPool();
  const [result] = await db.execute(
    "INSERT INTO webhook_events (payload) VALUES (?)",
    [JSON.stringify(payload)]
  );

  return (result as mysql.ResultSetHeader).insertId;
}
