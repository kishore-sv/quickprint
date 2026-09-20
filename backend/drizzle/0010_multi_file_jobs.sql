-- Multi-file print jobs: documents table + job aggregates

CREATE TABLE IF NOT EXISTS "print_job_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "print_job_id" uuid NOT NULL REFERENCES "print_jobs"("id") ON DELETE CASCADE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "saved_file_id" uuid REFERENCES "saved_files"("id"),
  "original_filename" varchar(512) NOT NULL,
  "storage_key" varchar(1024) NOT NULL,
  "file_hash" varchar(128) NOT NULL,
  "page_count" integer NOT NULL,
  "copies" integer NOT NULL,
  "page_range" varchar(128) NOT NULL,
  "color_mode" "colormode" NOT NULL,
  "paper_size" "papersize" NOT NULL,
  "duplex" "duplexmode" NOT NULL,
  "pages_per_sheet" integer NOT NULL,
  "order" "pageorder" NOT NULL,
  "orientation" "orientation" NOT NULL,
  "fit_to_page" boolean NOT NULL,
  "physical_sheets" integer,
  "pages_in_range" integer,
  "amount_paise" integer,
  "pricing_snapshot" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ix_print_job_documents_job_id" ON "print_job_documents" ("print_job_id");
CREATE INDEX IF NOT EXISTS "ix_print_job_documents_saved_file_id" ON "print_job_documents" ("saved_file_id");

ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "document_count" integer NOT NULL DEFAULT 1;
ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "merged_storage_key" varchar(1024);
ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "total_logical_pages" integer;
ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "bw_physical_sheets" integer;
ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "color_physical_sheets" integer;

-- Backfill existing single-file jobs into print_job_documents
INSERT INTO "print_job_documents" (
  "print_job_id",
  "sort_order",
  "saved_file_id",
  "original_filename",
  "storage_key",
  "file_hash",
  "page_count",
  "copies",
  "page_range",
  "color_mode",
  "paper_size",
  "duplex",
  "pages_per_sheet",
  "order",
  "orientation",
  "fit_to_page",
  "physical_sheets",
  "pages_in_range",
  "amount_paise",
  "pricing_snapshot"
)
SELECT
  pj."id",
  0,
  pj."saved_file_id",
  pj."original_filename",
  pj."storage_key",
  pj."file_hash",
  pj."page_count",
  pj."copies",
  pj."page_range",
  pj."color_mode",
  pj."paper_size",
  pj."duplex",
  pj."pages_per_sheet",
  pj."order",
  pj."orientation",
  pj."fit_to_page",
  pj."physical_sheets",
  COALESCE((pj."pricing_snapshot"->>'pages_in_range')::integer, pj."page_count"),
  pj."amount_paise",
  pj."pricing_snapshot"
FROM "print_jobs" pj
WHERE NOT EXISTS (
  SELECT 1 FROM "print_job_documents" d WHERE d."print_job_id" = pj."id"
);

UPDATE "print_jobs" pj
SET
  "document_count" = 1,
  "total_logical_pages" = COALESCE(
    (pj."pricing_snapshot"->>'pages_in_range')::integer,
    pj."page_count"
  ),
  "bw_physical_sheets" = CASE WHEN pj."color_mode" = 'BW' THEN pj."physical_sheets" ELSE 0 END,
  "color_physical_sheets" = CASE WHEN pj."color_mode" = 'COLOR' THEN pj."physical_sheets" ELSE 0 END
WHERE pj."total_logical_pages" IS NULL;
