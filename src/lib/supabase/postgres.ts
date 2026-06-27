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
      max: 5,
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
