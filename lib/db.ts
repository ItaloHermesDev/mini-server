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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS webhook_request_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kind VARCHAR(20) NOT NULL,
      payload JSON NULL,
      user_agent VARCHAR(512) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function logWebhookRequest(
  kind: "challenge" | "event" | "invalid_json",
  payload: unknown,
  userAgent: string | null
): Promise<void> {
  await ensureWebhookTable();

  const db = getPool();
  await db.execute(
    "INSERT INTO webhook_request_logs (kind, payload, user_agent) VALUES (?, ?, ?)",
    [
      kind,
      payload === undefined ? null : JSON.stringify(payload),
      userAgent,
    ]
  );
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

export type WebhookEventRow = {
  id: number;
  payload: unknown;
  created_at: Date;
};

export async function getWebhookEvents(limit = 50): Promise<WebhookEventRow[]> {
  await ensureWebhookTable();

  const db = getPool();
  const [rows] = await db.execute(
    "SELECT id, payload, created_at FROM webhook_events ORDER BY id DESC LIMIT ?",
    [limit]
  );

  return (rows as WebhookEventRow[]).map((row) => ({
    ...row,
    payload:
      typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
  }));
}

export async function testDbConnection(): Promise<{
  ok: true;
  eventCount: number;
  requestCount: number;
  host: string;
  database: string;
}> {
  await ensureWebhookTable();
  const config = getDbConfig();
  const db = getPool();

  await db.execute("SELECT 1");

  const [rows] = await db.execute(
    "SELECT COUNT(*) AS eventCount FROM webhook_events"
  );

  const [logRows] = await db.execute(
    "SELECT COUNT(*) AS requestCount FROM webhook_request_logs"
  );

  const eventCount = Number(
    (rows as Array<{ eventCount: number }>)[0]?.eventCount ?? 0
  );

  const requestCount = Number(
    (logRows as Array<{ requestCount: number }>)[0]?.requestCount ?? 0
  );

  return {
    ok: true,
    eventCount,
    requestCount,
    host: config.host,
    database: config.database,
  };
}
