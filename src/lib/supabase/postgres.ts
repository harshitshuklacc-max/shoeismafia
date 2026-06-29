import pg from "pg";

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      host: process.env.DB_HOST || "aws-1-ap-south-1.pooler.supabase.com",
      port: parseInt(process.env.DB_PORT || "6543"),
      database: process.env.DB_NAME || "postgres",
      user: process.env.DB_USER || "postgres.fsvamqiyukmkltjxabrg",
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function dbQuery<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function dbQueryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await dbQuery<T>(text, params);
  return rows[0] || null;
}

export async function dbTransaction<T>(
  fn: (query: (text: string, params?: unknown[]) => Promise<pg.QueryResult>) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn((text, params) => client.query(text, params));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
