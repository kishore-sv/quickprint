-- Operational logs for admin audit/monitoring
DO $$ BEGIN
  CREATE TYPE operativeloglevel AS ENUM ('INFO', 'WARNING', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS operational_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level operativeloglevel NOT NULL,
  event VARCHAR(64) NOT NULL,
  actor_type VARCHAR(32),
  actor_id TEXT,
  resource_type VARCHAR(64),
  resource_id TEXT,
  kiosk_id UUID REFERENCES kiosks(id) ON DELETE SET NULL,
  print_job_id UUID REFERENCES print_jobs(id) ON DELETE SET NULL,
  message VARCHAR(1024),
  metadata JSONB,
  request_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_operational_logs_created_at ON operational_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_operational_logs_event ON operational_logs (event);
CREATE INDEX IF NOT EXISTS ix_operational_logs_level ON operational_logs (level);
CREATE INDEX IF NOT EXISTS ix_operational_logs_kiosk_id ON operational_logs (kiosk_id);
CREATE INDEX IF NOT EXISTS ix_operational_logs_print_job_id ON operational_logs (print_job_id);
CREATE INDEX IF NOT EXISTS ix_operational_logs_resource ON operational_logs (resource_type, resource_id);

-- Kiosk health and description for admin
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS description VARCHAR(1024);
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS agent_health JSONB;
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS agent_version VARCHAR(64);
