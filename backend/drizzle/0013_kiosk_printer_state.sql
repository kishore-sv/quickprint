CREATE TABLE IF NOT EXISTS "kiosk_printer_state" (
  "kiosk_id" uuid PRIMARY KEY NOT NULL REFERENCES "kiosks"("id") ON DELETE CASCADE,
  "printer_name" varchar(255),
  "connection_state" varchar(32) NOT NULL,
  "operational_state" varchar(32) NOT NULL,
  "display_state" varchar(32) NOT NULL,
  "reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "raw_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "capabilities" jsonb,
  "telemetry_last_seen_at" timestamptz,
  "state_changed_at" timestamptz,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "last_sequence" integer DEFAULT 0 NOT NULL,
  "last_event_id" varchar(64),
  "last_probe_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "kiosk_printer_state_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kiosk_id" uuid NOT NULL REFERENCES "kiosks"("id") ON DELETE CASCADE,
  "connection_state" varchar(32) NOT NULL,
  "display_state" varchar(32) NOT NULL,
  "reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "raw_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sequence" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ix_kiosk_printer_state_events_kiosk_id"
  ON "kiosk_printer_state_events" ("kiosk_id");
