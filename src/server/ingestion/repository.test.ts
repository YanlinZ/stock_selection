import { describe, expect, it } from "vitest";

import {
  holdings,
  keyPriceLevels,
  macroObservations,
  marketDataDaily,
  watchlistItems
} from "@/db/schema";

import { createIngestionRepository } from "./repository";

describe("createIngestionRepository", () => {
  it("includes key price level instruments in the refresh plan", async () => {
    const repository = createIngestionRepository(
      createFakeDb({
        holdings: [createInstrument("instrument_tsla", "TSLA", "stock")],
        keyPriceLevelInstruments: [
          createInstrument("instrument_btc", "btc", "crypto", {
            coingeckoId: "bitcoin"
          }),
          createInstrument("instrument_eth", "ETH", "crypto"),
          createInstrument("instrument_tsla", "tsla", "stock")
        ],
        watchlistItems: [createInstrument("instrument_hood", "HOOD", "stock")]
      }) as never
    );

    const plan = await repository.getRefreshPlan();

    expect(
      plan.marketData.map((target) => ({
        instrumentId: target.instrumentId,
        provider: target.provider,
        symbol: target.symbol
      }))
    ).toEqual([
      {
        instrumentId: "instrument_btc",
        provider: "coingecko",
        symbol: "BTC"
      },
      {
        instrumentId: "instrument_eth",
        provider: "coingecko",
        symbol: "ETH"
      },
      {
        instrumentId: "instrument_hood",
        provider: "fmp",
        symbol: "HOOD"
      },
      {
        instrumentId: "instrument_tsla",
        provider: "fmp",
        symbol: "TSLA"
      }
    ]);
    expect(
      plan.marketData.filter(
        (target) => target.instrumentId === "instrument_tsla"
      )
    ).toHaveLength(1);
    expect(plan.macroObservations.map((target) => target.seriesId)).toEqual([
      "DGS10",
      "VIXCLS"
    ]);
  });

  it("bulk upserts market data points in one database statement", async () => {
    const db = createRecordingInsertDb();
    const repository = createIngestionRepository(db as never);

    const written = await repository.upsertMarketDataPoints({
      ingestionRunId: "run_market",
      instrumentId: "instrument_googl",
      rawResponseId: "raw_market",
      points: [
        {
          adjustedClose: 100,
          close: 101,
          currency: "USD",
          date: "2026-05-18",
          high: 105,
          low: 99,
          open: 100,
          sourceProvider: "fmp",
          symbol: "GOOGL",
          volume: 12345
        },
        {
          adjustedClose: null,
          close: 102,
          currency: "USD",
          date: "2026-05-19",
          high: null,
          low: null,
          open: null,
          sourceProvider: "fmp",
          symbol: "GOOGL",
          volume: null
        }
      ]
    });

    expect(written).toBe(2);
    expect(db.insertCalls).toHaveLength(1);
    expect(db.insertCalls[0]).toMatchObject({
      table: marketDataDaily
    });
    expect(db.insertCalls[0]?.values).toEqual([
      expect.objectContaining({
        adjustedClose: "100",
        close: "101",
        date: "2026-05-18",
        high: "105",
        ingestionRunId: "run_market",
        instrumentId: "instrument_googl",
        low: "99",
        open: "100",
        provider: "fmp",
        rawResponseId: "raw_market",
        updatedAt: expect.any(Date),
        volume: "12345"
      }),
      expect.objectContaining({
        adjustedClose: undefined,
        close: "102",
        date: "2026-05-19",
        high: undefined,
        low: undefined,
        open: undefined,
        provider: "fmp",
        volume: undefined
      })
    ]);
    expect(db.insertCalls[0]?.conflict).toBeDefined();
  });

  it("deduplicates market data conflicts within the same bulk upsert", async () => {
    const db = createRecordingInsertDb();
    const repository = createIngestionRepository(db as never);

    const written = await repository.upsertMarketDataPoints({
      ingestionRunId: "run_market",
      instrumentId: "instrument_googl",
      rawResponseId: "raw_market",
      points: [
        {
          adjustedClose: null,
          close: 101,
          currency: "USD",
          date: "2026-05-19",
          high: null,
          low: null,
          open: null,
          sourceProvider: "fmp",
          symbol: "GOOGL",
          volume: null
        },
        {
          adjustedClose: null,
          close: 102,
          currency: "USD",
          date: "2026-05-19",
          high: null,
          low: null,
          open: null,
          sourceProvider: "fmp",
          symbol: "GOOGL",
          volume: null
        }
      ]
    });

    expect(written).toBe(2);
    expect(db.insertCalls).toHaveLength(1);
    expect(db.insertCalls[0]?.values).toEqual([
      expect.objectContaining({
        close: "102",
        date: "2026-05-19",
        instrumentId: "instrument_googl",
        provider: "fmp"
      })
    ]);
  });

  it("bulk upserts macro observation points in one database statement", async () => {
    const db = createRecordingInsertDb();
    const repository = createIngestionRepository(db as never);

    const written = await repository.upsertMacroObservationPoints({
      ingestionRunId: "run_macro",
      rawResponseId: "raw_macro",
      points: [
        {
          date: "2026-05-18",
          seriesId: "DGS10",
          sourceProvider: "fred",
          unit: "percent",
          value: 4.45
        },
        {
          date: "2026-05-19",
          seriesId: "DGS10",
          sourceProvider: "fred",
          unit: null,
          value: 4.5
        }
      ]
    });

    expect(written).toBe(2);
    expect(db.insertCalls).toHaveLength(1);
    expect(db.insertCalls[0]).toMatchObject({
      table: macroObservations
    });
    expect(db.insertCalls[0]?.values).toEqual([
      expect.objectContaining({
        date: "2026-05-18",
        ingestionRunId: "run_macro",
        provider: "fred",
        rawResponseId: "raw_macro",
        seriesId: "DGS10",
        unit: "percent",
        updatedAt: expect.any(Date),
        value: "4.45"
      }),
      expect.objectContaining({
        date: "2026-05-19",
        provider: "fred",
        seriesId: "DGS10",
        unit: undefined,
        value: "4.5"
      })
    ]);
    expect(db.insertCalls[0]?.conflict).toBeDefined();
  });

  it("deduplicates macro observation conflicts within the same bulk upsert", async () => {
    const db = createRecordingInsertDb();
    const repository = createIngestionRepository(db as never);

    const written = await repository.upsertMacroObservationPoints({
      ingestionRunId: "run_macro",
      rawResponseId: "raw_macro",
      points: [
        {
          date: "2026-05-19",
          seriesId: "DGS10",
          sourceProvider: "fred",
          unit: "percent",
          value: 4.45
        },
        {
          date: "2026-05-19",
          seriesId: "DGS10",
          sourceProvider: "fred",
          unit: "percent",
          value: 4.5
        }
      ]
    });

    expect(written).toBe(2);
    expect(db.insertCalls).toHaveLength(1);
    expect(db.insertCalls[0]?.values).toEqual([
      expect.objectContaining({
        date: "2026-05-19",
        provider: "fred",
        seriesId: "DGS10",
        value: "4.5"
      })
    ]);
  });
});

type FakeInstrument = {
  assetType: "crypto" | "stock";
  currency: string;
  id: string;
  providerMetadata: Record<string, unknown>;
  symbol: string;
};

function createFakeDb(input: {
  holdings: FakeInstrument[];
  keyPriceLevelInstruments: FakeInstrument[];
  watchlistItems: FakeInstrument[];
}) {
  return {
    select() {
      return createFakeSelect(input);
    }
  };
}

type InsertCall = {
  conflict: unknown;
  table: unknown;
  values: unknown;
};

function createRecordingInsertDb() {
  const insertCalls: InsertCall[] = [];

  return {
    insert(table: unknown) {
      const call: InsertCall = {
        conflict: null,
        table,
        values: null
      };
      insertCalls.push(call);

      return {
        values(values: unknown) {
          call.values = values;

          return {
            onConflictDoUpdate(conflict: unknown) {
              call.conflict = conflict;
              return Promise.resolve();
            }
          };
        }
      };
    },
    insertCalls
  };
}

function createFakeSelect(input: {
  holdings: FakeInstrument[];
  keyPriceLevelInstruments: FakeInstrument[];
  watchlistItems: FakeInstrument[];
}) {
  let rows: Array<{ instrument: FakeInstrument }> = [];
  const query = {
    from(table: unknown) {
      if (table === holdings) {
        rows = input.holdings.map((instrument) => ({ instrument }));
      } else if (table === keyPriceLevels) {
        rows = input.keyPriceLevelInstruments.map((instrument) => ({
          instrument
        }));
      } else if (table === watchlistItems) {
        rows = input.watchlistItems.map((instrument) => ({ instrument }));
      }

      return query;
    },
    innerJoin() {
      return query;
    },
    orderBy() {
      return query;
    },
    then<TResult1 = Array<{ instrument: FakeInstrument }>, TResult2 = never>(
      onFulfilled?:
        | ((
            value: Array<{ instrument: FakeInstrument }>
          ) => TResult1 | PromiseLike<TResult1>)
        | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
    where() {
      return query;
    }
  };

  return query;
}

function createInstrument(
  id: string,
  symbol: string,
  assetType: FakeInstrument["assetType"],
  providerMetadata: Record<string, unknown> = {}
): FakeInstrument {
  return {
    assetType,
    currency: "USD",
    id,
    providerMetadata,
    symbol
  };
}
