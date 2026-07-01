import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
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
