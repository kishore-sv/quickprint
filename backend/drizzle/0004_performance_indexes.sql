-- Additive performance indexes (idempotent)

CREATE INDEX IF NOT EXISTS ix_print_jobs_user_id ON print_jobs (user_id);
CREATE INDEX IF NOT EXISTS ix_print_jobs_user_id_created_at ON print_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_saved_files_user_id ON saved_files (user_id);
CREATE INDEX IF NOT EXISTS ix_saved_files_user_id_created_at ON saved_files (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_payments_print_job_id_status_created_at
  ON payments (print_job_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_kiosk_sessions_user_kiosk_expires
  ON kiosk_sessions (user_id, kiosk_id, expires_at);
