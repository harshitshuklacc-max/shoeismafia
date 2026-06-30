import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  host: process.env.DB_HOST || "aws-1-ap-south-1.pooler.supabase.com",
  port: parseInt(process.env.DB_PORT || "6543"),
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres.fsvamqiyukmkltjxabrg",
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const sql = readFileSync(
  join(__dirname, "..", "supabase", "migrations", "003_printer_settings.sql"),
  "utf8"
);
await client.query(sql);
console.log("Migration 003 applied");
await client.end();
