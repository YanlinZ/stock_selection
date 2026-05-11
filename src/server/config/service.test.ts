import { describe, expect, it } from "vitest";

import { createConfigService } from "./service";
import type { ConfigRepository } from "./repository";
import type {
  HoldingRecord,
  InstrumentRecord,
  KeyPriceLevelRecord,
  UserPreferenceRecord,
  WatchlistItemRecord
} from "./types";

describe("createConfigService", () => {
  it("normalizes holding symbols and creates the instrument before the holding", async () => {
    const fake = createFakeConfigRepository();
    const service = createConfigService(fake.repository);

    const holding = await service.upsertHolding({
      symbol: " tsla ",
      holdingType: "long_term",
      costBasis: "300.25",
      positionSize: "medium",
      notes: "Long-term core holding"
    });

    const instrument = fake.findInstrument("TSLA");

    expect(instrument?.symbol).toBe("TSLA");
    expect(instrument?.assetType).toBe("stock");
    expect(holding.instrumentId).toBe(instrument?.id);
    expect(holding.costBasis).toBe("300.25");
    expect(holding.positionSize).toBe("medium");
  });

  it("stores crypto key levels with normalized symbols and currencies", async () => {
    const fake = createFakeConfigRepository();
    const service = createConfigService(fake.repository);

    const keyPriceLevel = await service.upsertKeyPriceLevel({
      symbol: " btc ",
      assetType: "crypto",
      currency: "usd",
      levelType: "long_term_add",
      price: 60000,
      notes: "Personal long-term add zone"
    });

    const instrument = fake.findInstrument("BTC");

    expect(instrument?.assetType).toBe("crypto");
    expect(instrument?.currency).toBe("USD");
    expect(keyPriceLevel.instrumentId).toBe(instrument?.id);
    expect(keyPriceLevel.price).toBe("60000");
    expect(keyPriceLevel.currency).toBe("USD");
  });

  it("rejects invalid key price levels before hitting the repository", async () => {
    const fake = createFakeConfigRepository();
    const service = createConfigService(fake.repository);

    await expect(
      service.upsertKeyPriceLevel({
        symbol: "TSLA",
        levelType: "long_term_add",
        price: 0
      })
    ).rejects.toThrow();

    expect(fake.keyPriceLevels.size).toBe(0);
  });

  it("stores watchlist items and user preferences through the repository contract", async () => {
    const fake = createFakeConfigRepository();
    const service = createConfigService(fake.repository);

    const watchlistItem = await service.upsertWatchlistItem({
      symbol: " hood ",
      priority: 80,
      theme: "fintech",
      notes: "Watch near personal add level"
    });
    const preference = await service.upsertUserPreference({
      key: "default_horizon",
      value: { days: 5 }
    });

    expect(fake.findInstrument("HOOD")?.symbol).toBe("HOOD");
    expect(watchlistItem.priority).toBe(80);
    expect(watchlistItem.theme).toBe("fintech");
    expect(preference.value).toEqual({ days: 5 });
  });
});

function createFakeConfigRepository() {
  let idSequence = 0;
  const timestamp = new Date("2026-05-11T00:00:00.000Z");
  const instruments = new Map<string, InstrumentRecord>();
  const holdings = new Map<string, HoldingRecord>();
  const watchlistItems = new Map<string, WatchlistItemRecord>();
  const keyPriceLevels = new Map<string, KeyPriceLevelRecord>();
  const userPreferences = new Map<string, UserPreferenceRecord>();

  const nextId = (prefix: string) => `${prefix}_${++idSequence}`;

  const repository: ConfigRepository = {
    async upsertInstrument(input) {
      const existing = instruments.get(input.symbol);
      const instrument: InstrumentRecord = {
        id: existing?.id ?? nextId("instrument"),
        symbol: input.symbol,
        name: input.name,
        assetType: input.assetType,
        currency: input.currency,
        exchange: input.exchange,
        providerMetadata: input.providerMetadata,
        isActive: input.isActive,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      };

      instruments.set(instrument.symbol, instrument);

      return instrument;
    },

    async upsertHolding(input) {
      const existing = holdings.get(input.instrumentId);
      const holding: HoldingRecord = {
        id: existing?.id ?? nextId("holding"),
        instrumentId: input.instrumentId,
        holdingType: input.holdingType,
        costBasis: input.costBasis,
        positionSize: input.positionSize,
        notes: input.notes,
        isActive: input.isActive,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      };

      holdings.set(input.instrumentId, holding);

      return holding;
    },

    async upsertWatchlistItem(input) {
      const existing = watchlistItems.get(input.instrumentId);
      const watchlistItem: WatchlistItemRecord = {
        id: existing?.id ?? nextId("watchlist"),
        instrumentId: input.instrumentId,
        priority: input.priority,
        theme: input.theme,
        notes: input.notes,
        isActive: input.isActive,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      };

      watchlistItems.set(input.instrumentId, watchlistItem);

      return watchlistItem;
    },

    async upsertKeyPriceLevel(input) {
      const key = `${input.instrumentId}:${input.levelType}:${input.price}`;
      const existing = keyPriceLevels.get(key);
      const keyPriceLevel: KeyPriceLevelRecord = {
        id: existing?.id ?? nextId("level"),
        instrumentId: input.instrumentId,
        levelType: input.levelType,
        price: input.price,
        currency: input.currency,
        notes: input.notes,
        isActive: input.isActive,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      };

      keyPriceLevels.set(key, keyPriceLevel);

      return keyPriceLevel;
    },

    async upsertUserPreference(input) {
      const existing = userPreferences.get(input.key);
      const preference: UserPreferenceRecord = {
        key: input.key,
        value: input.value,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      };

      userPreferences.set(input.key, preference);

      return preference;
    }
  };

  return {
    repository,
    instruments,
    holdings,
    watchlistItems,
    keyPriceLevels,
    userPreferences,
    findInstrument(symbol: string) {
      return instruments.get(symbol);
    }
  };
}
