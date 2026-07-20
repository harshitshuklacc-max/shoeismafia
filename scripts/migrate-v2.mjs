import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  "syovcgsxqogywygaoykm";

const client = new pg.Client({
  host: process.env.DB_HOST || `db.${PROJECT_REF}.supabase.co`,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "002_salesmen_parties.sql"), "utf8");
await client.query(sql);
console.log("Migration 002 applied");
await client.end();
