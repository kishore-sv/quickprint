import IORedis from "ioredis";
import { env } from "../config/env";

export function createRedisConnection(label = "default"): IORedis {
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  connection.on("error", (err) => {
    console.error(`[redis:${label}]`, err.message);
  });
  return connection;
}

export async function closeRedisConnection(connection: IORedis): Promise<void> {
  if (connection.status === "end" || connection.status === "close") return;
  await connection.quit();
}
