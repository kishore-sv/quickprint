-- Kiosk display read-only credentials (additive)

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS display_token_hash VARCHAR(128);
