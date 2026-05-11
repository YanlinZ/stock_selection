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

  it("updates and deactivates existing configuration records by id", async () => {
    const fake = createFakeConfigRepository();
    const service = createConfigService(fake.repository);

    const holding = await service.upsertHolding({
      symbol: "NET",
      holdingType: "long_term",
      positionSize: "small"
    });
    const updatedHolding = await service.updateHolding({
      id: holding.id,
      holdingType: "short_term",
      costBasis: "85.5",
      positionSize: "medium",
      notes: "Testing an edit path"
    });
    const deactivatedHolding = await service.deactivateHolding(holding.id);

    expect(updatedHolding.holdingType).toBe("short_term");
    expect(updatedHolding.costBasis).toBe("85.5");
    expect(deactivatedHolding.isActive).toBe(false);

    const watchlistItem = await service.upsertWatchlistItem({
      symbol: "HOOD",
      priority: 10
    });
    const updatedWatchlistItem = await service.updateWatchlistItem({
      id: watchlistItem.id,
      priority: "90",
      theme: "fintech",
      notes: "Near alert zone"
    });
    const deactivatedWatchlistItem = await service.deactivateWatchlistItem(
      watchlistItem.id
    );

    expect(updatedWatchlistItem.priority).toBe(90);
    expect(updatedWatchlistItem.theme).toBe("fintech");
    expect(deactivatedWatchlistItem.isActive).toBe(false);

    const keyPriceLevel = await service.upsertKeyPriceLevel({
      symbol: "BTC",
      assetType: "crypto",
      levelType: "long_term_add",
      price: 60000
    });
    const updatedKeyPriceLevel = await service.updateKeyPriceLevel({
      id: keyPriceLevel.id,
      levelType: "watch",
      price: "61000",
      currency: "usd",
      notes: "Edited watch level"
    });
    const deactivatedKeyPriceLevel = await service.deactivateKeyPriceLevel(
      keyPriceLevel.id
    );

    expect(updatedKeyPriceLevel.levelType).toBe("watch");
    expect(updatedKeyPriceLevel.price).toBe("61000");
    expect(updatedKeyPriceLevel.currency).toBe("USD");
    expect(deactivatedKeyPriceLevel.isActive).toBe(false);
  });
});

function createFakeConfigRepository() {
  let idSequence = 0;
  const timestamp = new Date("2026-05-11T00:00:00.000Z");
  const instruments = new Map<string, InstrumentRecord>();
  const holdings = createRecordStore<HoldingRecord>();
  const watchlistItems = createRecordStore<WatchlistItemRecord>();
  const keyPriceLevels = createRecordStore<KeyPriceLevelRecord>();
  const userPreferences = new Map<string, UserPreferenceRecord>();

  const nextId = (prefix: string) => `${prefix}_${++idSequence}`;

  const repository: ConfigRepository = {
    async getConfigSnapshot() {
      return {
        holdings: [...holdings.values()].map((holding) => ({
          holding,
          instrument: requireInstrumentById(holding.instrumentId)
        })),
        watchlistItems: [...watchlistItems.values()].map((watchlistItem) => ({
          watchlistItem,
          instrument: requireInstrumentById(watchlistItem.instrumentId)
        })),
        keyPriceLevels: [...keyPriceLevels.values()].map((keyPriceLevel) => ({
          keyPriceLevel,
          instrument: requireInstrumentById(keyPriceLevel.instrumentId)
        })),
        userPreferences: [...userPreferences.values()]
      };
    },

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
    },

    async updateHolding(input) {
      const existing = holdings.getById(input.id);

      if (!existing) {
        throw new Error("Holding not found.");
      }

      const holding: HoldingRecord = {
        ...existing,
        holdingType: input.holdingType,
        costBasis: input.costBasis,
        positionSize: input.positionSize,
        notes: input.notes,
        isActive: input.isActive,
        updatedAt: timestamp
      };

      holdings.set(existing.instrumentId, holding);

      return holding;
    },

    async updateWatchlistItem(input) {
      const existing = watchlistItems.getById(input.id);

      if (!existing) {
        throw new Error("Watchlist item not found.");
      }

      const watchlistItem: WatchlistItemRecord = {
        ...existing,
        priority: input.priority,
        theme: input.theme,
        notes: input.notes,
        isActive: input.isActive,
        updatedAt: timestamp
      };

      watchlistItems.set(existing.instrumentId, watchlistItem);

      return watchlistItem;
    },

    async updateKeyPriceLevel(input) {
      const existing = keyPriceLevels.getById(input.id);

      if (!existing) {
        throw new Error("Key price level not found.");
      }

      const keyPriceLevel: KeyPriceLevelRecord = {
        ...existing,
        levelType: input.levelType,
        price: input.price,
        currency: input.currency,
        notes: input.notes,
        isActive: input.isActive,
        updatedAt: timestamp
      };

      keyPriceLevels.deleteById(existing.id);
      keyPriceLevels.set(
        `${existing.instrumentId}:${input.levelType}:${input.price}`,
        keyPriceLevel
      );

      return keyPriceLevel;
    },

    async deactivateHolding(id) {
      const existing = holdings.getById(id);

      if (!existing) {
        throw new Error("Holding not found.");
      }

      const holding: HoldingRecord = {
        ...existing,
        isActive: false,
        updatedAt: timestamp
      };

      holdings.set(existing.instrumentId, holding);

      return holding;
    },

    async deactivateWatchlistItem(id) {
      const existing = watchlistItems.getById(id);

      if (!existing) {
        throw new Error("Watchlist item not found.");
      }

      const watchlistItem: WatchlistItemRecord = {
        ...existing,
        isActive: false,
        updatedAt: timestamp
      };

      watchlistItems.set(existing.instrumentId, watchlistItem);

      return watchlistItem;
    },

    async deactivateKeyPriceLevel(id) {
      const existing = keyPriceLevels.getById(id);

      if (!existing) {
        throw new Error("Key price level not found.");
      }

      const keyPriceLevel: KeyPriceLevelRecord = {
        ...existing,
        isActive: false,
        updatedAt: timestamp
      };

      keyPriceLevels.set(
        `${existing.instrumentId}:${existing.levelType}:${existing.price}`,
        keyPriceLevel
      );

      return keyPriceLevel;
    }
  };

  return {
    repository,
    instruments,
    holdings: holdings.map,
    watchlistItems: watchlistItems.map,
    keyPriceLevels: keyPriceLevels.map,
    userPreferences,
    findInstrument(symbol: string) {
      return instruments.get(symbol);
    }
  };

  function requireInstrumentById(id: string) {
    const instrument = [...instruments.values()].find((item) => item.id === id);

    if (!instrument) {
      throw new Error("Instrument not found.");
    }

    return instrument;
  }
}

function createRecordStore<T extends { id: string }>() {
  const map = new Map<string, T>();

  return {
    map,
    set(key: string, value: T) {
      map.set(key, value);
    },
    values() {
      return map.values();
    },
    get(key: string) {
      return map.get(key);
    },
    getById(id: string) {
      return [...map.values()].find((value) => value.id === id);
    },
    deleteById(id: string) {
      const entry = [...map.entries()].find(([, value]) => value.id === id);

      if (entry) {
        map.delete(entry[0]);
      }
    },
    get size() {
      return map.size;
    }
  };
}
