import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const pricingRules = pgTable("pricing_rules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 64 }).notNull(),
  bwPerSheetPaise: integer("bw_per_sheet_paise").notNull(),
  colorPerSheetPaise: integer("color_per_sheet_paise").notNull(),
  currency: varchar("currency", { length: 8 }).notNull(),
  isActive: boolean("is_active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
