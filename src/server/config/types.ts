import type { InferSelectModel } from "drizzle-orm";

import {
  holdings,
  instruments,
  keyPriceLevels,
  userPreferences,
  watchlistItems
} from "@/db/schema";

export const assetTypes = [
  "stock",
  "etf",
  "crypto",
  "macro",
  "index",
  "other"
] as const;

export const holdingTypes = ["long_term", "short_term", "watch_only"] as const;

export const positionSizes = ["small", "medium", "large", "unknown"] as const;

export const keyPriceLevelTypes = [
  "long_term_add",
  "watch",
  "support",
  "resistance",
  "risk"
] as const;

export type AssetType = (typeof assetTypes)[number];
export type HoldingType = (typeof holdingTypes)[number];
export type PositionSize = (typeof positionSizes)[number];
export type KeyPriceLevelType = (typeof keyPriceLevelTypes)[number];

export type InstrumentRecord = InferSelectModel<typeof instruments>;
export type HoldingRecord = InferSelectModel<typeof holdings>;
export type WatchlistItemRecord = InferSelectModel<typeof watchlistItems>;
export type KeyPriceLevelRecord = InferSelectModel<typeof keyPriceLevels>;
export type UserPreferenceRecord = InferSelectModel<typeof userPreferences>;

export type UpsertInstrumentRepositoryInput = {
  symbol: string;
  name: string | null;
  assetType: AssetType;
  currency: string;
  exchange: string | null;
  providerMetadata: Record<string, unknown>;
  isActive: boolean;
};

export type UpsertHoldingRepositoryInput = {
  instrumentId: string;
  holdingType: HoldingType;
  costBasis: string | null;
  positionSize: PositionSize;
  notes: string | null;
  isActive: boolean;
};

export type UpsertWatchlistItemRepositoryInput = {
  instrumentId: string;
  priority: number;
  theme: string | null;
  notes: string | null;
  isActive: boolean;
};

export type UpsertKeyPriceLevelRepositoryInput = {
  instrumentId: string;
  levelType: KeyPriceLevelType;
  price: string;
  currency: string;
  notes: string | null;
  isActive: boolean;
};

export type UpsertUserPreferenceRepositoryInput = {
  key: string;
  value: Record<string, unknown>;
};

export type HoldingConfigItem = {
  holding: HoldingRecord;
  instrument: InstrumentRecord;
};

export type WatchlistConfigItem = {
  watchlistItem: WatchlistItemRecord;
  instrument: InstrumentRecord;
};

export type KeyPriceLevelConfigItem = {
  keyPriceLevel: KeyPriceLevelRecord;
  instrument: InstrumentRecord;
};

export type ConfigSnapshot = {
  holdings: HoldingConfigItem[];
  watchlistItems: WatchlistConfigItem[];
  keyPriceLevels: KeyPriceLevelConfigItem[];
  userPreferences: UserPreferenceRecord[];
};

export type UpdateHoldingRepositoryInput = {
  id: string;
  holdingType: HoldingType;
  costBasis: string | null;
  positionSize: PositionSize;
  notes: string | null;
  isActive: boolean;
};

export type UpdateWatchlistItemRepositoryInput = {
  id: string;
  priority: number;
  theme: string | null;
  notes: string | null;
  isActive: boolean;
};

export type UpdateKeyPriceLevelRepositoryInput = {
  id: string;
  levelType: KeyPriceLevelType;
  price: string;
  currency: string;
  notes: string | null;
  isActive: boolean;
};
