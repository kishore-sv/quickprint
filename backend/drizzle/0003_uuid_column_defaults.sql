-- Legacy Alembic tables omit gen_random_uuid() defaults; align with Drizzle schema.
ALTER TABLE print_jobs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE print_job_events ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE payments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE kiosk_sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE saved_files ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE kiosks ALTER COLUMN id SET DEFAULT gen_random_uuid();
