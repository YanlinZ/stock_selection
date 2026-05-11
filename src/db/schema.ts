import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const assetTypeEnum = pgEnum("asset_type", [
  "stock",
  "etf",
  "crypto",
  "macro",
  "index",
  "other"
]);

export const holdingTypeEnum = pgEnum("holding_type", [
  "long_term",
  "short_term",
  "watch_only"
]);

export const positionSizeEnum = pgEnum("position_size", [
  "small",
  "medium",
  "large",
  "unknown"
]);

export const keyPriceLevelTypeEnum = pgEnum("key_price_level_type", [
  "long_term_add",
  "watch",
  "support",
  "resistance",
  "risk"
]);

export const providerEnum = pgEnum("provider", [
  "fmp",
  "coingecko",
  "fred",
  "manual",
  "fake"
]);

export const ingestionStatusEnum = pgEnum("ingestion_status", [
  "pending",
  "running",
  "success",
  "partial_success",
  "failed"
]);

export const appMetadata = pgTable("app_metadata", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const instruments = pgTable(
  "instruments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: text("symbol").notNull(),
    name: text("name"),
    assetType: assetTypeEnum("asset_type").notNull(),
    currency: text("currency").notNull().default("USD"),
    exchange: text("exchange"),
    providerMetadata: jsonb("provider_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("instruments_symbol_unique").on(table.symbol),
    index("instruments_asset_type_idx").on(table.assetType)
  ]
);

export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    holdingType: holdingTypeEnum("holding_type").notNull().default("long_term"),
    costBasis: numeric("cost_basis", { precision: 18, scale: 4 }),
    positionSize: positionSizeEnum("position_size").notNull().default("unknown"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("holdings_instrument_unique").on(table.instrumentId),
    index("holdings_holding_type_idx").on(table.holdingType)
  ]
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    priority: integer("priority").notNull().default(0),
    theme: text("theme"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("watchlist_items_instrument_unique").on(table.instrumentId),
    index("watchlist_items_priority_idx").on(table.priority)
  ]
);

export const keyPriceLevels = pgTable(
  "key_price_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    levelType: keyPriceLevelTypeEnum("level_type").notNull(),
    price: numeric("price", { precision: 18, scale: 4 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("key_price_levels_instrument_type_price_unique").on(
      table.instrumentId,
      table.levelType,
      table.price
    ),
    index("key_price_levels_instrument_idx").on(table.instrumentId)
  ]
);

export const userPreferences = pgTable("user_preferences", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: providerEnum("provider").notNull(),
    status: ingestionStatusEnum("status").notNull().default("running"),
    targetKind: text("target_kind").notNull(),
    targetSymbol: text("target_symbol"),
    requestedBy: text("requested_by").notNull().default("manual"),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("ingestion_runs_provider_status_idx").on(table.provider, table.status),
    index("ingestion_runs_started_at_idx").on(table.startedAt)
  ]
);

export const providerRawResponses = pgTable(
  "provider_raw_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: providerEnum("provider").notNull(),
    endpoint: text("endpoint").notNull(),
    requestKey: text("request_key").notNull(),
    requestParams: jsonb("request_params")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    responseStatus: integer("response_status"),
    payload: jsonb("payload").$type<unknown>(),
    errorMessage: text("error_message"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    ingestionRunId: uuid("ingestion_run_id").references(() => ingestionRuns.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("provider_raw_responses_provider_request_idx").on(
      table.provider,
      table.requestKey
    ),
    index("provider_raw_responses_fetched_at_idx").on(table.fetchedAt)
  ]
);

export const marketDataDaily = pgTable(
  "market_data_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    provider: providerEnum("provider").notNull(),
    date: date("date").notNull(),
    open: numeric("open", { precision: 18, scale: 4 }),
    high: numeric("high", { precision: 18, scale: 4 }),
    low: numeric("low", { precision: 18, scale: 4 }),
    close: numeric("close", { precision: 18, scale: 4 }).notNull(),
    adjustedClose: numeric("adjusted_close", { precision: 18, scale: 4 }),
    volume: numeric("volume", { precision: 24, scale: 4 }),
    rawResponseId: uuid("raw_response_id").references(() => providerRawResponses.id, {
      onDelete: "set null"
    }),
    ingestionRunId: uuid("ingestion_run_id").references(() => ingestionRuns.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("market_data_daily_instrument_provider_date_unique").on(
      table.instrumentId,
      table.provider,
      table.date
    ),
    index("market_data_daily_date_idx").on(table.date)
  ]
);

export const macroObservations = pgTable(
  "macro_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: text("series_id").notNull(),
    provider: providerEnum("provider").notNull(),
    date: date("date").notNull(),
    value: numeric("value", { precision: 24, scale: 8 }).notNull(),
    unit: text("unit"),
    rawResponseId: uuid("raw_response_id").references(() => providerRawResponses.id, {
      onDelete: "set null"
    }),
    ingestionRunId: uuid("ingestion_run_id").references(() => ingestionRuns.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("macro_observations_series_provider_date_unique").on(
      table.seriesId,
      table.provider,
      table.date
    ),
    index("macro_observations_date_idx").on(table.date)
  ]
);
