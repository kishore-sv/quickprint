import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./src/db/schema/index.ts", "./src/db/relations.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
