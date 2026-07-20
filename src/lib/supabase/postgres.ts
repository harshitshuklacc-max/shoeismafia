import pg from "pg";

let pool: pg.Pool | null = null;

function getProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

/** Vercel is IPv4-only; Supabase direct host (db.*) is IPv6-only — pooler required. */
function shouldUsePooler(): boolean {
  if (process.env.DB_USE_POOLER === "true") return true;
  if (process.env.VERCEL === "1") return true;
  if (process.env.DB_HOST?.includes("pooler")) return true;
  return false;
}

function getPostgresConfig(): pg.PoolConfig {
  const projectRef = getProjectRef();
  const password = process.env.DB_PASSWORD;
  const base = {
    password,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  if (process.env.DATABASE_URL) {
    return { ...base, connectionString: process.env.DATABASE_URL };
  }

  const usePooler = shouldUsePooler();

  if (usePooler && projectRef) {
    const host =
      process.env.DB_POOLER_HOST ||
      (process.env.DB_HOST?.includes("pooler") ? process.env.DB_HOST : null) ||
      "aws-1-ap-northeast-2.pooler.supabase.com";
    return {
      ...base,
      host,
      port: parseInt(process.env.DB_PORT || "6543", 10),
      database: process.env.DB_NAME || "postgres",
      user: process.env.DB_USER || `postgres.${projectRef}`,
    };
  }

  if (process.env.DB_HOST) {
    const isPooler = process.env.DB_HOST.includes("pooler");
    return {
      ...base,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || (isPooler ? "6543" : "5432"), 10),
      database: process.env.DB_NAME || "postgres",
      user:
        process.env.DB_USER ||
        (isPooler && projectRef ? `postgres.${projectRef}` : "postgres"),
    };
  }

  if (projectRef) {
    return {
      ...base,
      host: `db.${projectRef}.supabase.co`,
      port: parseInt(process.env.DB_PORT || "5432", 10),
      database: process.env.DB_NAME || "postgres",
      user: process.env.DB_USER || "postgres",
    };
  }

  throw new Error(
    "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and DB_PASSWORD."
  );
}

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool(getPostgresConfig());
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
