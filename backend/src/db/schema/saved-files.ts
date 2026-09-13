import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const savedFiles = pgTable(
  "saved_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    storageKey: varchar("storage_key", { length: 1024 }).notNull(),
    originalFilename: varchar("original_filename", { length: 512 }).notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    fileHash: varchar("file_hash", { length: 128 }).notNull(),
    pageCount: integer("page_count").notNull(),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ix_saved_files_user_id").on(t.userId),
    index("ix_saved_files_user_id_created_at").on(t.userId, t.createdAt),
    index("ix_saved_files_retention_until").on(t.retentionUntil),
  ]
);
