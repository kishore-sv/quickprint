/**
 * Idempotent development admin seed.
 * Usage: ADMIN_SEED_PASSWORD=... bun run admin:seed
 */

import { eq } from "drizzle-orm";
import { auth } from "../auth";
import { env } from "../config/env";
import { pool } from "../db";
import { logOperationalEvent } from "../services/operational-log.service";

const DEFAULT_DEV_EMAIL = "kishorevphs@gmail.com";

async function main() {
  const email = env.ADMIN_SEED_EMAIL ?? DEFAULT_DEV_EMAIL;
  const password = env.ADMIN_SEED_PASSWORD;

  if (env.NODE_ENV === "production" && !env.ALLOW_ADMIN_SEED) {
    console.error("Admin seed is disabled in production. Set ALLOW_ADMIN_SEED=true to override.");
    process.exit(1);
  }

  if (!password) {
    console.error("ADMIN_SEED_PASSWORD is required to seed the admin user.");
    process.exit(1);
  }

  const existing = await pool.query(`SELECT id, role FROM "user" WHERE email = $1 LIMIT 1`, [
    email,
  ]);

  let userId: string;

  if (existing.rows.length === 0) {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "QuickPrint Admin",
      },
    });
    if (!result?.user?.id) {
      console.error("Failed to create admin user");
      process.exit(1);
    }
    userId = result.user.id;
    console.log("Created admin user:", email);
  } else {
    userId = existing.rows[0].id as string;
    console.log("Admin user already exists:", email);
  }

  await pool.query(`UPDATE "user" SET role = 'admin' WHERE id = $1 AND (role IS NULL OR role != 'admin')`, [
    userId,
  ]);

  await logOperationalEvent({
    level: "INFO",
    event: "ADMIN_CREATED",
    actor: { type: "system", id: "seed" },
    resource: { type: "user", id: userId },
    message: `Admin role ensured for ${email}`,
    metadata: { email },
  });

  console.log("Admin role ensured for:", email);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
