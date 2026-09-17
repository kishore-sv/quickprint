/**
 * Apply additive SQL migrations in backend/drizzle/*.sql (idempotent).
 * Usage: bun run src/scripts/apply-sql-migrations.ts
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { pool } from "../db";

const MIGRATIONS_DIR = join(import.meta.dir, "../../drizzle");

async function main() {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    // Drizzle Kit baseline migrations (0000_*.sql) are applied via db:push / db:migrate, not db:apply.
    .filter((f) => !/^0000_/.test(f))
    .sort();

  if (files.length === 0) {
    console.log("No SQL migration files found.");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    for (const file of files) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
      console.log(`  OK`);
    }
    console.log(`\nApplied ${files.length} migration file(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
