import { describe, expect, it } from "vitest";

import { createDashboardSnapshot } from "./service";
import type {
  DashboardHoldingInput,
  DashboardInputSnapshot,
  DashboardKeyPriceLevelInput,
  DashboardMacroObservation,
  DashboardMarketDataPoint,
  DashboardWatchlistInput
} from "./types";

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
      kind: "consider_small_add"
    });
    expect(snapshot.summary.label).toContain("市场恐慌升温");
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
    positionSize: "medium"
  };
}

function createWatchlistItem(symbol: string): DashboardWatchlistInput {
  return {
    id: `watchlist_${symbol}`,
    instrument: createInstrument(symbol),
    notes: null,
    priority: 1,
    theme: null
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
    price
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
    instrumentId,
    low: close - 2,
    open: close - 1,
    provider: "fmp",
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
    provider: "fred",
    seriesId,
    unit: seriesId === "DGS10" ? "percent" : "index",
    value
  };
}
