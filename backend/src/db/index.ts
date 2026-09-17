import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import { buildRdsPoolSsl, stripSslQueryParams } from "./pool-config";
import * as schema from "./schema";
import * as relations from "./relations";

const poolMax = Number(process.env.DB_POOL_MAX ?? "10");
const idleTimeoutMillis = Number(process.env.DB_POOL_IDLE_MS ?? "30000");
const connectionTimeoutMillis = Number(process.env.DB_POOL_CONNECT_MS ?? "10000");

const poolSsl = buildRdsPoolSsl();
const connectionString = poolSsl
  ? stripSslQueryParams(env.DATABASE_URL)
  : env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ...(poolSsl ? { ssl: poolSsl } : {}),
  max: poolMax,
  idleTimeoutMillis,
  connectionTimeoutMillis,
  application_name: "quickprint-api",
});

export const db = drizzle(pool, { schema: { ...schema, ...relations } });

export type Db = typeof db;
