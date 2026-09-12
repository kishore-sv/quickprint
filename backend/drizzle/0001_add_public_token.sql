-- Add secure kiosk public token (idempotent for existing DBs from Alembic)
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS public_token VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS kiosks_public_token_unique ON kiosks (public_token) WHERE public_token IS NOT NULL;
