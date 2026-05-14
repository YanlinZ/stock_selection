CREATE TABLE "dashboard_decision_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date NOT NULL,
	"scope" text NOT NULL,
	"subject_key" text NOT NULL,
	"instrument_id" uuid,
	"symbol" text,
	"action_kind" text NOT NULL,
	"action_label" text NOT NULL,
	"confidence" text NOT NULL,
	"data_quality" text NOT NULL,
	"basis_date" date,
	"data_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"key_levels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"macro_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rule_version" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dashboard_decision_snapshots" ADD CONSTRAINT "dashboard_decision_snapshots_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_decision_snapshots_daily_subject_unique" ON "dashboard_decision_snapshots" USING btree ("snapshot_date","scope","subject_key","rule_version");--> statement-breakpoint
CREATE INDEX "dashboard_decision_snapshots_instrument_idx" ON "dashboard_decision_snapshots" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "dashboard_decision_snapshots_generated_at_idx" ON "dashboard_decision_snapshots" USING btree ("generated_at");