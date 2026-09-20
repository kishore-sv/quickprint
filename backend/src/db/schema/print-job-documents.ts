import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  colorModeEnum,
  duplexModeEnum,
  orientationEnum,
  pageOrderEnum,
  paperSizeEnum,
} from "./enums";
import { printJobs } from "./print-jobs";
import { savedFiles } from "./saved-files";

export const printJobDocuments = pgTable(
  "print_job_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    printJobId: uuid("print_job_id")
      .notNull()
      .references(() => printJobs.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    savedFileId: uuid("saved_file_id").references(() => savedFiles.id),
    originalFilename: varchar("original_filename", { length: 512 }).notNull(),
    storageKey: varchar("storage_key", { length: 1024 }).notNull(),
    fileHash: varchar("file_hash", { length: 128 }).notNull(),
    pageCount: integer("page_count").notNull(),
    copies: integer("copies").notNull(),
    pageRange: varchar("page_range", { length: 128 }).notNull(),
    colorMode: colorModeEnum("color_mode").notNull(),
    paperSize: paperSizeEnum("paper_size").notNull(),
    duplex: duplexModeEnum("duplex").notNull(),
    pagesPerSheet: integer("pages_per_sheet").notNull(),
    order: pageOrderEnum("order").notNull(),
    orientation: orientationEnum("orientation").notNull(),
    fitToPage: boolean("fit_to_page").notNull(),
    physicalSheets: integer("physical_sheets"),
    pagesInRange: integer("pages_in_range"),
    amountPaise: integer("amount_paise"),
    pricingSnapshot: jsonb("pricing_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ix_print_job_documents_job_id").on(t.printJobId),
    index("ix_print_job_documents_saved_file_id").on(t.savedFileId),
  ]
);
