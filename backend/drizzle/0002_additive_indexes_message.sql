-- Additive only: optional event message + indexes (skip if already present)
ALTER TABLE print_job_events ADD COLUMN IF NOT EXISTS message VARCHAR(512);

CREATE INDEX IF NOT EXISTS ix_saved_files_retention_until ON saved_files (retention_until);
CREATE INDEX IF NOT EXISTS ix_print_jobs_status ON print_jobs (status);
CREATE INDEX IF NOT EXISTS ix_print_jobs_created_at ON print_jobs (created_at);
CREATE INDEX IF NOT EXISTS ix_print_jobs_kiosk_id ON print_jobs (kiosk_id);
CREATE INDEX IF NOT EXISTS ix_print_jobs_saved_file_id ON print_jobs (saved_file_id);
CREATE INDEX IF NOT EXISTS ix_print_job_events_print_job_id ON print_job_events (print_job_id);
CREATE INDEX IF NOT EXISTS ix_kiosk_sessions_kiosk_id ON kiosk_sessions (kiosk_id);
CREATE INDEX IF NOT EXISTS ix_payments_razorpay_payment_id ON payments (razorpay_payment_id);
