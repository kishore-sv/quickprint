-- Kiosk Pi agent credentials and job dispatch metadata (additive)

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS agent_token_hash VARCHAR(128);

CREATE INDEX IF NOT EXISTS ix_print_jobs_kiosk_status_created
  ON print_jobs (kiosk_id, status, created_at);

ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS printer_job_id VARCHAR(128);
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(512);
