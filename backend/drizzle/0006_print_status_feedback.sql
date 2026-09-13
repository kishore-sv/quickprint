-- Print status feedback: Pi phase tracking, safe errors, cleanup metadata
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS pi_phase VARCHAR(32);
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS user_error_code VARCHAR(64);
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS cleanup_status VARCHAR(32);
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS last_pi_event_at TIMESTAMPTZ;
