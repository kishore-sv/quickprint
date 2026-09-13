import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import * as schema from "./schema";
import * as relations from "./relations";

const poolMax = Number(process.env.DB_POOL_MAX ?? "10");
const idleTimeoutMillis = Number(process.env.DB_POOL_IDLE_MS ?? "30000");
const connectionTimeoutMillis = Number(process.env.DB_POOL_CONNECT_MS ?? "10000");

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: poolMax,
  idleTimeoutMillis,
  connectionTimeoutMillis,
  application_name: "quickprint-api",
});

export const db = drizzle(pool, { schema: { ...schema, ...relations } });

export type Db = typeof db;
