import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { env } from "./env";

export const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on("error", (err) => {
  console.error("[pg] unexpected error on idle client", err);
});

/**
 * Runs sql/001_init.sql (idempotent - uses CREATE TABLE IF NOT EXISTS)
 * on boot so `npm run dev` works against a fresh Postgres with zero
 * manual migration steps.
 */
export async function runMigrations() {
  const sqlPath = path.join(__dirname, "..", "..", "sql", "001_init.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  await pool.query(sql);
  console.log("[db] migrations applied");
}
