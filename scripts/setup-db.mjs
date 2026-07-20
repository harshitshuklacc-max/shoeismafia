import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
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

  if (!process.env.DB_PASSWORD) {
    console.error("Set DB_PASSWORD to your Supabase database password before running setup.");
    process.exit(1);
  }

  await client.connect();
  console.log("Connected to Supabase Postgres");

  const schema = readFileSync(join(__dirname, "..", "supabase", "schema.sql"), "utf8");
  await client.query(schema);
  console.log("Schema applied successfully");

  await client.end();
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
