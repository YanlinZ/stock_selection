import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  holdings,
  instruments,
  keyPriceLevels,
  userPreferences,
  watchlistItems
} from "@/db/schema";

import type {
  HoldingRecord,
  InstrumentRecord,
  KeyPriceLevelRecord,
  UpsertHoldingRepositoryInput,
  UpsertInstrumentRepositoryInput,
  UpsertKeyPriceLevelRepositoryInput,
  UpsertUserPreferenceRepositoryInput,
  UpsertWatchlistItemRepositoryInput,
  ConfigSnapshot,
  UpdateHoldingRepositoryInput,
  UpdateKeyPriceLevelRepositoryInput,
  UpdateWatchlistItemRepositoryInput,
  UserPreferenceRecord,
  WatchlistItemRecord
} from "./types";

type Db = ReturnType<typeof getDb>;

export type ConfigRepository = {
  getConfigSnapshot(): Promise<ConfigSnapshot>;
  upsertInstrument(input: UpsertInstrumentRepositoryInput): Promise<InstrumentRecord>;
  upsertHolding(input: UpsertHoldingRepositoryInput): Promise<HoldingRecord>;
  upsertWatchlistItem(
    input: UpsertWatchlistItemRepositoryInput
  ): Promise<WatchlistItemRecord>;
  upsertKeyPriceLevel(
    input: UpsertKeyPriceLevelRepositoryInput
  ): Promise<KeyPriceLevelRecord>;
  upsertUserPreference(
    input: UpsertUserPreferenceRepositoryInput
  ): Promise<UserPreferenceRecord>;
  updateHolding(input: UpdateHoldingRepositoryInput): Promise<HoldingRecord>;
  updateWatchlistItem(
    input: UpdateWatchlistItemRepositoryInput
  ): Promise<WatchlistItemRecord>;
  updateKeyPriceLevel(
    input: UpdateKeyPriceLevelRepositoryInput
  ): Promise<KeyPriceLevelRecord>;
  deactivateHolding(id: string): Promise<HoldingRecord>;
  deactivateWatchlistItem(id: string): Promise<WatchlistItemRecord>;
  deactivateKeyPriceLevel(id: string): Promise<KeyPriceLevelRecord>;
};

export function createConfigRepository(db: Db = getDb()): ConfigRepository {
  return {
    async getConfigSnapshot() {
      const [holdingRows, watchlistRows, keyPriceLevelRows, preferences] =
        await Promise.all([
          db
            .select({
              holding: holdings,
              instrument: instruments
            })
            .from(holdings)
            .innerJoin(instruments, eq(holdings.instrumentId, instruments.id))
            .where(eq(holdings.isActive, true))
            .orderBy(asc(instruments.symbol)),
          db
            .select({
              watchlistItem: watchlistItems,
              instrument: instruments
            })
            .from(watchlistItems)
            .innerJoin(instruments, eq(watchlistItems.instrumentId, instruments.id))
            .where(eq(watchlistItems.isActive, true))
            .orderBy(asc(watchlistItems.priority), asc(instruments.symbol)),
          db
            .select({
              keyPriceLevel: keyPriceLevels,
              instrument: instruments
            })
            .from(keyPriceLevels)
            .innerJoin(instruments, eq(keyPriceLevels.instrumentId, instruments.id))
            .where(eq(keyPriceLevels.isActive, true))
            .orderBy(asc(instruments.symbol), asc(keyPriceLevels.levelType)),
          db.select().from(userPreferences).orderBy(asc(userPreferences.key))
        ]);

      return {
        holdings: holdingRows,
        watchlistItems: watchlistRows,
        keyPriceLevels: keyPriceLevelRows,
        userPreferences: preferences
      };
    },

    async upsertInstrument(input) {
      const now = new Date();
      const [instrument] = await db
        .insert(instruments)
        .values({
          symbol: input.symbol,
          name: input.name,
          assetType: input.assetType,
          currency: input.currency,
          exchange: input.exchange,
          providerMetadata: input.providerMetadata,
          isActive: input.isActive
        })
        .onConflictDoUpdate({
          target: instruments.symbol,
          set: {
            name: input.name,
            assetType: input.assetType,
            currency: input.currency,
            exchange: input.exchange,
            providerMetadata: input.providerMetadata,
            isActive: input.isActive,
            updatedAt: now
          }
        })
        .returning();

      return requireRow(instrument, "Instrument upsert returned no row.");
    },

    async upsertHolding(input) {
      const now = new Date();
      const [holding] = await db
        .insert(holdings)
        .values({
          instrumentId: input.instrumentId,
          holdingType: input.holdingType,
          costBasis: input.costBasis,
          positionSize: input.positionSize,
          notes: input.notes,
          isActive: input.isActive
        })
        .onConflictDoUpdate({
          target: holdings.instrumentId,
          set: {
            holdingType: input.holdingType,
            costBasis: input.costBasis,
            positionSize: input.positionSize,
            notes: input.notes,
            isActive: input.isActive,
            updatedAt: now
          }
        })
        .returning();

      return requireRow(holding, "Holding upsert returned no row.");
    },

    async upsertWatchlistItem(input) {
      const now = new Date();
      const [watchlistItem] = await db
        .insert(watchlistItems)
        .values({
          instrumentId: input.instrumentId,
          priority: input.priority,
          theme: input.theme,
          notes: input.notes,
          isActive: input.isActive
        })
        .onConflictDoUpdate({
          target: watchlistItems.instrumentId,
          set: {
            priority: input.priority,
            theme: input.theme,
            notes: input.notes,
            isActive: input.isActive,
            updatedAt: now
          }
        })
        .returning();

      return requireRow(watchlistItem, "Watchlist item upsert returned no row.");
    },

    async upsertKeyPriceLevel(input) {
      const now = new Date();
      const [keyPriceLevel] = await db
        .insert(keyPriceLevels)
        .values({
          instrumentId: input.instrumentId,
          levelType: input.levelType,
          price: input.price,
          currency: input.currency,
          notes: input.notes,
          isActive: input.isActive
        })
        .onConflictDoUpdate({
          target: [
            keyPriceLevels.instrumentId,
            keyPriceLevels.levelType,
            keyPriceLevels.price
          ],
          set: {
            currency: input.currency,
            notes: input.notes,
            isActive: input.isActive,
            updatedAt: now
          }
        })
        .returning();

      return requireRow(keyPriceLevel, "Key price level upsert returned no row.");
    },

    async upsertUserPreference(input) {
      const now = new Date();
      const [preference] = await db
        .insert(userPreferences)
        .values({
          key: input.key,
          value: input.value
        })
        .onConflictDoUpdate({
          target: userPreferences.key,
          set: {
            value: input.value,
            updatedAt: now
          }
        })
        .returning();

      return requireRow(preference, "User preference upsert returned no row.");
    },

    async updateHolding(input) {
      const [holding] = await db
        .update(holdings)
        .set({
          holdingType: input.holdingType,
          costBasis: input.costBasis,
          positionSize: input.positionSize,
          notes: input.notes,
          isActive: input.isActive,
          updatedAt: new Date()
        })
        .where(eq(holdings.id, input.id))
        .returning();

      return requireRow(holding, "Holding update returned no row.");
    },

    async updateWatchlistItem(input) {
      const [watchlistItem] = await db
        .update(watchlistItems)
        .set({
          priority: input.priority,
          theme: input.theme,
          notes: input.notes,
          isActive: input.isActive,
          updatedAt: new Date()
        })
        .where(eq(watchlistItems.id, input.id))
        .returning();

      return requireRow(watchlistItem, "Watchlist item update returned no row.");
    },

    async updateKeyPriceLevel(input) {
      const [keyPriceLevel] = await db
        .update(keyPriceLevels)
        .set({
          levelType: input.levelType,
          price: input.price,
          currency: input.currency,
          notes: input.notes,
          isActive: input.isActive,
          updatedAt: new Date()
        })
        .where(eq(keyPriceLevels.id, input.id))
        .returning();

      return requireRow(keyPriceLevel, "Key price level update returned no row.");
    },

    async deactivateHolding(id) {
      const [holding] = await db
        .update(holdings)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(holdings.id, id))
        .returning();

      return requireRow(holding, "Holding deactivate returned no row.");
    },

    async deactivateWatchlistItem(id) {
      const [watchlistItem] = await db
        .update(watchlistItems)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(watchlistItems.id, id))
        .returning();

      return requireRow(watchlistItem, "Watchlist item deactivate returned no row.");
    },

    async deactivateKeyPriceLevel(id) {
      const [keyPriceLevel] = await db
        .update(keyPriceLevels)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(keyPriceLevels.id, id))
        .returning();

      return requireRow(keyPriceLevel, "Key price level deactivate returned no row.");
    }
  };
}

export async function findInstrumentBySymbol(
  symbol: string,
  db: Db = getDb()
): Promise<InstrumentRecord | null> {
  const [instrument] = await db
    .select()
    .from(instruments)
    .where(eq(instruments.symbol, symbol))
    .limit(1);

  return instrument ?? null;
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }

  return row;
}
