import { defineConfig } from "drizzle-kit";
import { buildRdsPoolSsl, stripSslQueryParams } from "./src/db/pool-config";

const databaseUrl = process.env.DATABASE_URL!;
const ssl = buildRdsPoolSsl();

export default defineConfig({
  schema: ["./src/db/schema/index.ts", "./src/db/relations.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: ssl ? stripSslQueryParams(databaseUrl) : databaseUrl,
    ...(ssl ? { ssl } : {}),
  },
});
