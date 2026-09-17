import { defineConfig } from "drizzle-kit";
import {
  buildRdsPoolSsl,
  parseDatabaseUrl,
  stripSslQueryParams,
} from "./src/db/pool-config";

const databaseUrl = process.env.DATABASE_URL!;
const ssl = buildRdsPoolSsl();

// drizzle-kit ignores `ssl` when dbCredentials uses `url` — pass discrete fields instead.
const dbCredentials = ssl
  ? {
      ...parseDatabaseUrl(stripSslQueryParams(databaseUrl)),
      ssl,
    }
  : { url: databaseUrl };

export default defineConfig({
  schema: ["./src/db/schema/index.ts", "./src/db/relations.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials,
});
