/**
 * Test database connectivity using the shared pg Pool.
 * Usage: bun run db:ping
 */

import { pool } from "../db";

function redactedConnectionTarget(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    const database = parsed.pathname.replace(/^\//, "") || "(default)";
    const port = parsed.port || "5432";
    return `${parsed.hostname}:${port}/${database}`;
  } catch {
    return "(unknown)";
  }
}

async function main() {
  const target = redactedConnectionTarget(pool.options.connectionString ?? "");
  try {
    const result = await pool.query("SELECT version() AS version");
    const version = result.rows[0]?.version ?? "unknown";
    console.log(`Database connection OK (${target})`);
    console.log(version);
    process.exitCode = 0;
  } catch (error) {
    console.error(`Database connection failed (${target})`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
