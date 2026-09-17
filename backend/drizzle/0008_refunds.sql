DO $$ BEGIN
  CREATE TYPE refundstatus AS ENUM ('PROCESSING', 'REFUNDED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  print_job_id UUID NOT NULL REFERENCES print_jobs(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  razorpay_payment_id VARCHAR(128) NOT NULL,
  razorpay_refund_id VARCHAR(128),
  amount_paise INTEGER NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status refundstatus NOT NULL,
  failure_reason VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT refunds_print_job_id_unique UNIQUE (print_job_id)
);

CREATE INDEX IF NOT EXISTS ix_refunds_print_job_id ON refunds (print_job_id);
CREATE INDEX IF NOT EXISTS ix_refunds_payment_id ON refunds (payment_id);
CREATE INDEX IF NOT EXISTS ix_refunds_status ON refunds (status);
