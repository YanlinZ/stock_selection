import { describe, expect, it } from "vitest";

import {
  createDailyDecisionSnapshotRecords,
  createDashboardService,
  createDashboardSnapshot
} from "./service";
import type {
  DashboardHoldingInput,
  DashboardInputSnapshot,
  DashboardKeyPriceLevelInput,
  DashboardMacroObservation,
  DashboardMarketDataPoint,
  DashboardWatchlistInput
} from "./types";
import type { DashboardRepository } from "./repository";

const now = new Date("2026-05-13T12:00:00.000Z");

describe("createDashboardSnapshot", () => {
  it("returns an unavailable dashboard when configured targets have no market data", () => {
    const snapshot = createDashboardSnapshot(
      createInput({
        holdings: [createHolding("TSLA")]
      }),
      now
    );

    expect(snapshot.status).toBe("unavailable");
    expect(snapshot.summary.kind).toBe("refresh_data");
    expect(snapshot.holdings[0]?.dataStatus).toBe("unavailable");
    expect(snapshot.holdings[0]?.action).toMatchObject({
      confidence: "low",
      dataQuality: "unavailable"
    });
    expect(snapshot.holdings[0]?.action.evidence.missing[0]?.label).toContain(
      "market_data_daily"
    );
  });

  it("marks stale normalized data clearly", () => {
    const snapshot = createDashboardSnapshot(
      createInput({
        holdings: [createHolding("TSLA")],
        macroObservations: [createObservation("VIXCLS", 17, "2026-05-01")],
        marketData: [createMarketPoint("instrument_TSLA", "2026-05-01", 300)]
      }),
      now
    );

    expect(snapshot.status).toBe("stale");
    expect(snapshot.dataFreshness.warnings.join(" ")).toContain("超过 7 天");
    expect(snapshot.summary.label).toContain("数据已过期");
    expect(snapshot.holdings[0]?.action.dataQuality).toBe("stale");
    expect(snapshot.holdings[0]?.action.confidence).toBe("low");
  });

  it("builds a normal dashboard with macro scoring, key level alerts, and indicators", () => {
    const snapshot = createDashboardSnapshot(
      createInput({
        holdings: [createHolding("TSLA")],
        keyPriceLevels: [createKeyLevel("TSLA", 300)],
        macroObservations: [
          createObservation("VIXCLS", 27, "2026-05-12"),
          createObservation("DGS10", 4.7, "2026-05-12")
        ],
        marketData: [
          ...createHistory("instrument_TSLA", 210, 294),
          createMarketPoint("instrument_QQQ", "2026-05-11", 100),
          createMarketPoint("instrument_QQQ", "2026-05-12", 97)
        ],
        watchlistItems: [createWatchlistItem("QQQ")]
      }),
      now
    );

    expect(snapshot.status).toBe("ready");
    expect(snapshot.macro.panicReboundMode.state).toBe("active");
    expect(snapshot.keyLevelAlerts).toHaveLength(1);
    expect(snapshot.holdings[0]?.movingAverages[200].status).toBe("ready");
    expect(snapshot.holdings[0]?.action).toMatchObject({
      basisDate: "2026-05-12",
      confidence: "high",
      dataQuality: "complete",
      kind: "consider_small_add"
    });
    expect(snapshot.holdings[0]?.action.evidence.supporting.length).toBeGreaterThan(
      0
    );
    expect(snapshot.holdings[0]?.action.dataSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          basisDate: "2026-05-12",
          kind: "price",
          provider: "FMP"
        }),
        expect.objectContaining({
          kind: "macro",
          provider: "FRED"
        })
      ])
    );
    expect(snapshot.summary.label).toContain("市场恐慌升温");
  });

  it("downgrades confidence and records missing evidence for partial inputs", () => {
    const snapshot = createDashboardSnapshot(
      createInput({
        holdings: [createHolding("TSLA")],
        marketData: createHistory("instrument_TSLA", 210, 294)
          .slice(-20)
          .map((point) => ({
            ...point,
            volume: null
          }))
      }),
      now
    );

    const action = snapshot.holdings[0]?.action;

    expect(action?.dataQuality).toBe("partial");
    expect(action?.confidence).toBe("low");
    expect(action?.kind).toBe("wait");
    expect(action?.evidence.missing.map((item) => item.label).join(" ")).toContain(
      "MA200"
    );
    expect(action?.evidence.missing.map((item) => item.label).join(" ")).toContain(
      "成交量"
    );
    expect(action?.evidence.missing.map((item) => item.label).join(" ")).toContain(
      "宏观"
    );
  });

  it("creates summary and holding decision snapshot records with safe replay context", () => {
    const snapshot = createDashboardSnapshot(
      createInput({
        holdings: [createHolding("TSLA")],
        keyPriceLevels: [createKeyLevel("TSLA", 300)],
        macroObservations: [
          createObservation("VIXCLS", 27, "2026-05-12"),
          createObservation("DGS10", 4.7, "2026-05-12")
        ],
        marketData: createHistory("instrument_TSLA", 210, 294)
      }),
      now
    );

    const records = createDailyDecisionSnapshotRecords(snapshot);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      scope: "summary",
      subjectKey: "summary"
    });
    expect(records[1]).toMatchObject({
      actionKind: "watch_key_level",
      instrumentId: "instrument_TSLA",
      scope: "holding",
      subjectKey: "instrument_TSLA"
    });
    expect(JSON.stringify(records)).not.toContain("rawResponse");
    expect(JSON.stringify(records)).not.toContain("secret");
  });

  it("does not fail dashboard rendering when daily snapshot persistence fails", async () => {
    const repository: DashboardRepository = {
      async getDashboardInputs() {
        return createInput({
          holdings: [createHolding("TSLA")],
          marketData: [createMarketPoint("instrument_TSLA", "2026-05-12", 294)]
        });
      },
      async persistDailyDecisionSnapshots() {
        throw new Error("snapshot write failed");
      }
    };

    const service = createDashboardService({
      clock: { now: () => now },
      repository
    });

    await expect(service.getDashboardSnapshot()).resolves.toMatchObject({
      generatedAt: now.toISOString()
    });
  });
});

function createInput(
  overrides: Partial<DashboardInputSnapshot> = {}
): DashboardInputSnapshot {
  return {
    holdings: [],
    keyPriceLevels: [],
    latestBatchRun: null,
    macroObservations: [],
    marketData: [],
    watchlistItems: [],
    ...overrides
  };
}

function createHolding(symbol: string): DashboardHoldingInput {
  return {
    costBasis: null,
    holdingType: "long_term",
    id: `holding_${symbol}`,
    instrument: createInstrument(symbol),
    notes: null,
    positionSize: "medium",
    updatedAt: now
  };
}

function createWatchlistItem(symbol: string): DashboardWatchlistInput {
  return {
    id: `watchlist_${symbol}`,
    instrument: createInstrument(symbol),
    notes: null,
    priority: 1,
    theme: null,
    updatedAt: now
  };
}

function createKeyLevel(
  symbol: string,
  price: number
): DashboardKeyPriceLevelInput {
  return {
    currency: "USD",
    id: `level_${symbol}`,
    instrument: createInstrument(symbol),
    levelType: "long_term_add",
    notes: "Personal add zone",
    price,
    updatedAt: now
  };
}

function createInstrument(symbol: string) {
  return {
    assetType: symbol === "QQQ" ? ("etf" as const) : ("stock" as const),
    currency: "USD",
    exchange: null,
    id: `instrument_${symbol}`,
    name: null,
    symbol
  };
}

function createHistory(
  instrumentId: string,
  count: number,
  latestClose: number
): DashboardMarketDataPoint[] {
  const start = new Date("2025-10-15T00:00:00.000Z");

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const close = latestClose - (count - index - 1);

    return createMarketPoint(instrumentId, date.toISOString().slice(0, 10), close);
  });
}

function createMarketPoint(
  instrumentId: string,
  date: string,
  close: number
): DashboardMarketDataPoint {
  return {
    adjustedClose: close,
    close,
    date,
    high: close + 2,
    ingestionRunId: "run_market",
    instrumentId,
    low: close - 2,
    open: close - 1,
    provider: "fmp",
    updatedAt: new Date(`${date}T21:00:00.000Z`),
    volume: 1000
  };
}

function createObservation(
  seriesId: string,
  value: number,
  date: string
): DashboardMacroObservation {
  return {
    date,
    ingestionRunId: "run_macro",
    provider: "fred",
    seriesId,
    unit: seriesId === "DGS10" ? "percent" : "index",
    updatedAt: new Date(`${date}T22:00:00.000Z`),
    value
  };
}
