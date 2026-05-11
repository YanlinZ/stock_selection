CREATE TYPE "public"."asset_type" AS ENUM('stock', 'etf', 'crypto', 'macro', 'index', 'other');--> statement-breakpoint
CREATE TYPE "public"."holding_type" AS ENUM('long_term', 'short_term', 'watch_only');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('pending', 'running', 'success', 'partial_success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."key_price_level_type" AS ENUM('long_term_add', 'watch', 'support', 'resistance', 'risk');--> statement-breakpoint
CREATE TYPE "public"."position_size" AS ENUM('small', 'medium', 'large', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('fmp', 'coingecko', 'fred', 'manual', 'fake');--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"holding_type" "holding_type" DEFAULT 'long_term' NOT NULL,
	"cost_basis" numeric(18, 4),
	"position_size" "position_size" DEFAULT 'unknown' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "provider" NOT NULL,
	"status" "ingestion_status" DEFAULT 'running' NOT NULL,
	"target_kind" text NOT NULL,
	"target_symbol" text,
	"requested_by" text DEFAULT 'manual' NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"name" text,
	"asset_type" "asset_type" NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"exchange" text,
	"provider_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_price_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"level_type" "key_price_level_type" NOT NULL,
	"price" numeric(18, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "macro_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" text NOT NULL,
	"provider" "provider" NOT NULL,
	"date" date NOT NULL,
	"value" numeric(24, 8) NOT NULL,
	"unit" text,
	"raw_response_id" uuid,
	"ingestion_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_data_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"date" date NOT NULL,
	"open" numeric(18, 4),
	"high" numeric(18, 4),
	"low" numeric(18, 4),
	"close" numeric(18, 4) NOT NULL,
	"adjusted_close" numeric(18, 4),
	"volume" numeric(24, 4),
	"raw_response_id" uuid,
	"ingestion_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_raw_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "provider" NOT NULL,
	"endpoint" text NOT NULL,
	"request_key" text NOT NULL,
	"request_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response_status" integer,
	"payload" jsonb,
	"error_message" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ingestion_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"theme" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_price_levels" ADD CONSTRAINT "key_price_levels_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macro_observations" ADD CONSTRAINT "macro_observations_raw_response_id_provider_raw_responses_id_fk" FOREIGN KEY ("raw_response_id") REFERENCES "public"."provider_raw_responses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macro_observations" ADD CONSTRAINT "macro_observations_ingestion_run_id_ingestion_runs_id_fk" FOREIGN KEY ("ingestion_run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_daily" ADD CONSTRAINT "market_data_daily_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_daily" ADD CONSTRAINT "market_data_daily_raw_response_id_provider_raw_responses_id_fk" FOREIGN KEY ("raw_response_id") REFERENCES "public"."provider_raw_responses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_daily" ADD CONSTRAINT "market_data_daily_ingestion_run_id_ingestion_runs_id_fk" FOREIGN KEY ("ingestion_run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_raw_responses" ADD CONSTRAINT "provider_raw_responses_ingestion_run_id_ingestion_runs_id_fk" FOREIGN KEY ("ingestion_run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "holdings_instrument_unique" ON "holdings" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "holdings_holding_type_idx" ON "holdings" USING btree ("holding_type");--> statement-breakpoint
CREATE INDEX "ingestion_runs_provider_status_idx" ON "ingestion_runs" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "ingestion_runs_started_at_idx" ON "ingestion_runs" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "instruments_symbol_unique" ON "instruments" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "instruments_asset_type_idx" ON "instruments" USING btree ("asset_type");--> statement-breakpoint
CREATE UNIQUE INDEX "key_price_levels_instrument_type_price_unique" ON "key_price_levels" USING btree ("instrument_id","level_type","price");--> statement-breakpoint
CREATE INDEX "key_price_levels_instrument_idx" ON "key_price_levels" USING btree ("instrument_id");--> statement-breakpoint
CREATE UNIQUE INDEX "macro_observations_series_provider_date_unique" ON "macro_observations" USING btree ("series_id","provider","date");--> statement-breakpoint
CREATE INDEX "macro_observations_date_idx" ON "macro_observations" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "market_data_daily_instrument_provider_date_unique" ON "market_data_daily" USING btree ("instrument_id","provider","date");--> statement-breakpoint
CREATE INDEX "market_data_daily_date_idx" ON "market_data_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "provider_raw_responses_provider_request_idx" ON "provider_raw_responses" USING btree ("provider","request_key");--> statement-breakpoint
CREATE INDEX "provider_raw_responses_fetched_at_idx" ON "provider_raw_responses" USING btree ("fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_items_instrument_unique" ON "watchlist_items" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "watchlist_items_priority_idx" ON "watchlist_items" USING btree ("priority");