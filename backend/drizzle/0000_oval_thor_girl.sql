CREATE TYPE "public"."colormode" AS ENUM('BW', 'COLOR');--> statement-breakpoint
CREATE TYPE "public"."duplexmode" AS ENUM('SINGLE', 'DOUBLE');--> statement-breakpoint
CREATE TYPE "public"."kioskstatus" AS ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE');--> statement-breakpoint
CREATE TYPE "public"."orientation" AS ENUM('AUTO', 'PORTRAIT', 'LANDSCAPE');--> statement-breakpoint
CREATE TYPE "public"."pageorder" AS ENUM('NORMAL', 'REVERSE');--> statement-breakpoint
CREATE TYPE "public"."papersize" AS ENUM('A4');--> statement-breakpoint
CREATE TYPE "public"."paymentrecordstatus" AS ENUM('CREATED', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."paymentstatus" AS ENUM('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."printjobstatus" AS ENUM('CREATED', 'PAYMENT_PENDING', 'PAID', 'QUEUED', 'CLAIMED', 'DOWNLOADING', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiosks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kiosk_code" varchar(64) NOT NULL,
	"public_token" varchar(64),
	"name" varchar(255) NOT NULL,
	"location" varchar(512),
	"status" "kioskstatus" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	"agent_token_hash" varchar(128),
	"display_token_hash" varchar(128),
	CONSTRAINT "kiosks_kiosk_code_unique" UNIQUE("kiosk_code"),
	CONSTRAINT "kiosks_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pricing_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(64) NOT NULL,
	"bw_per_sheet_paise" integer NOT NULL,
	"color_per_sheet_paise" integer NOT NULL,
	"currency" varchar(8) NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"storage_key" varchar(1024) NOT NULL,
	"original_filename" varchar(512) NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"file_hash" varchar(128) NOT NULL,
	"page_count" integer NOT NULL,
	"retention_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiosk_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kiosk_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_number" varchar(32) NOT NULL,
	"user_id" text NOT NULL,
	"kiosk_id" uuid,
	"saved_file_id" uuid,
	"status" "printjobstatus" NOT NULL,
	"payment_status" "paymentstatus" NOT NULL,
	"original_filename" varchar(512) NOT NULL,
	"storage_key" varchar(1024) NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"file_hash" varchar(128) NOT NULL,
	"page_count" integer NOT NULL,
	"copies" integer NOT NULL,
	"page_range" varchar(128) NOT NULL,
	"color_mode" "colormode" NOT NULL,
	"paper_size" "papersize" NOT NULL,
	"duplex" "duplexmode" NOT NULL,
	"pages_per_sheet" integer NOT NULL,
	"order" "pageorder" NOT NULL,
	"orientation" "orientation" NOT NULL,
	"fit_to_page" boolean NOT NULL,
	"physical_sheets" integer,
	"amount_paise" integer,
	"currency" varchar(8) NOT NULL,
	"pricing_snapshot" jsonb,
	"save_file" boolean NOT NULL,
	"file_retention_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"printing_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"printer_job_id" varchar(128),
	"failure_reason" varchar(512),
	"pi_phase" varchar(32),
	"user_error_code" varchar(64),
	"cleanup_status" varchar(32),
	"last_pi_event_at" timestamp with time zone,
	CONSTRAINT "print_jobs_job_number_unique" UNIQUE("job_number")
);
--> statement-breakpoint
CREATE TABLE "print_job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"print_job_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"message" varchar(512),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"print_job_id" uuid NOT NULL,
	"razorpay_order_id" varchar(128) NOT NULL,
	"razorpay_payment_id" varchar(128),
	"amount_paise" integer NOT NULL,
	"currency" varchar(8) NOT NULL,
	"status" "paymentrecordstatus" NOT NULL,
	"idempotency_key" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_razorpay_order_id_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "kiosk_sessions" ADD CONSTRAINT "kiosk_sessions_kiosk_id_kiosks_id_fk" FOREIGN KEY ("kiosk_id") REFERENCES "public"."kiosks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_kiosk_id_kiosks_id_fk" FOREIGN KEY ("kiosk_id") REFERENCES "public"."kiosks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_saved_file_id_saved_files_id_fk" FOREIGN KEY ("saved_file_id") REFERENCES "public"."saved_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_job_events" ADD CONSTRAINT "print_job_events_print_job_id_print_jobs_id_fk" FOREIGN KEY ("print_job_id") REFERENCES "public"."print_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_print_job_id_print_jobs_id_fk" FOREIGN KEY ("print_job_id") REFERENCES "public"."print_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_kiosks_kiosk_code" ON "kiosks" USING btree ("kiosk_code");--> statement-breakpoint
CREATE INDEX "ix_saved_files_user_id" ON "saved_files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_saved_files_user_id_created_at" ON "saved_files" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_saved_files_retention_until" ON "saved_files" USING btree ("retention_until");--> statement-breakpoint
CREATE INDEX "ix_kiosk_sessions_user_id" ON "kiosk_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_kiosk_sessions_kiosk_id" ON "kiosk_sessions" USING btree ("kiosk_id");--> statement-breakpoint
CREATE INDEX "ix_kiosk_sessions_user_kiosk_expires" ON "kiosk_sessions" USING btree ("user_id","kiosk_id","expires_at");--> statement-breakpoint
CREATE INDEX "ix_print_jobs_user_id" ON "print_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_print_jobs_user_id_created_at" ON "print_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_print_jobs_status" ON "print_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_print_jobs_created_at" ON "print_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_print_jobs_kiosk_id" ON "print_jobs" USING btree ("kiosk_id");--> statement-breakpoint
CREATE INDEX "ix_print_jobs_kiosk_status_created" ON "print_jobs" USING btree ("kiosk_id","status","created_at");--> statement-breakpoint
CREATE INDEX "ix_print_jobs_saved_file_id" ON "print_jobs" USING btree ("saved_file_id");--> statement-breakpoint
CREATE INDEX "ix_print_job_events_print_job_id" ON "print_job_events" USING btree ("print_job_id");--> statement-breakpoint
CREATE INDEX "ix_payments_print_job_id" ON "payments" USING btree ("print_job_id");--> statement-breakpoint
CREATE INDEX "ix_payments_print_job_id_status_created_at" ON "payments" USING btree ("print_job_id","status","created_at");--> statement-breakpoint
CREATE INDEX "ix_payments_razorpay_payment_id" ON "payments" USING btree ("razorpay_payment_id");