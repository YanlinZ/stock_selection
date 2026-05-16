import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { createDashboardSnapshot } from "@/server/dashboard/service";
import type {
  DashboardHoldingInput,
  DashboardInputSnapshot,
  DashboardKeyPriceLevelInput,
  DashboardMacroObservation,
  DashboardMarketDataPoint,
  DashboardWatchlistInput
} from "@/server/dashboard/types";

import { DashboardView } from "./dashboard-view";

const now = new Date("2026-05-13T12:00:00.000Z");

describe("DashboardView", () => {
  it("can render an unavailable dashboard snapshot without throwing", () => {
    const snapshot = createDashboardSnapshot(
      {
        holdings: [],
        keyPriceLevels: [],
        latestBatchRun: null,
        macroObservations: [],
        marketData: [],
        watchlistItems: []
      },
      now
    );

    expect(() => DashboardView({ snapshot })).not.toThrow();
  });

  it("renders the no-opportunity state with trust metadata", () => {
    const snapshot = createDashboardSnapshot(createInput(), now);
    const html = renderToStaticMarkup(DashboardView({ snapshot }));

    expect(html).toContain("今日机会");
    expect(html).toContain('href="/dashboard/history"');
    expect(html).toContain("今日无高质量关注机会");
    expect(html).toContain("数据不足");
    expect(html).toContain("缺口");
    expect(html).toContain("来源与更新时间");
  });

  it("renders the selected opportunity with rank, score, and evidence", () => {
    const snapshot = createDashboardSnapshot(
      createInput({
        keyPriceLevels: [createKeyLevel("QQQ", 300)],
        macroObservations: [
          createObservation("VIXCLS", 28, "2026-05-12"),
          createObservation("DGS10", 4.6, "2026-05-12")
        ],
        marketData: createDropHistory("instrument_QQQ", 330, 300),
        watchlistItems: [createWatchlistItem("QQQ", 90)]
      }),
      now
    );
    const html = renderToStaticMarkup(DashboardView({ snapshot }));

    expect(html).toContain("1 个重点");
    expect(html).toContain("排名 1");
    expect(html).toContain("今日重点观察：QQQ");
    expect(html).toContain("数据完整");
    expect(html).toContain("支持");
    expect(html).toContain("风险");
    expect(html).toContain("来源与更新时间");
  });

  it("renders the redesign status strip and dense target rows with inline evidence access", () => {
    const snapshot = createDashboardSnapshot(
      createInput({
        holdings: [createHolding("TSLA")],
        keyPriceLevels: [
          createKeyLevel("TSLA", 180),
          createKeyLevel("HOOD", 35)
        ],
        macroObservations: [
          createObservation("VIXCLS", 18, "2026-05-12"),
          createObservation("DGS10", 4.1, "2026-05-12")
        ],
        marketData: [
          ...createDropHistory("instrument_TSLA", 190, 184),
          ...createDropHistory("instrument_HOOD", 42, 36)
        ],
        watchlistItems: [createWatchlistItem("HOOD", 80)]
      }),
      now
    );
    const html = renderToStaticMarkup(DashboardView({ snapshot }));

    expect(html).toContain('data-dashboard-region="status-strip"');
    expect(html).toContain('data-dashboard-region="holdings-table"');
    expect(html).toContain('data-dashboard-region="watchlist-table"');
    expect(html).toContain("<details");
    expect(html).toContain("查看证据");
    expect(html).not.toContain("持仓状态");
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

function createWatchlistItem(
  symbol: string,
  priority = 1
): DashboardWatchlistInput {
  return {
    id: `watchlist_${symbol}`,
    instrument: createInstrument(symbol),
    notes: null,
    priority,
    theme: null,
    updatedAt: now
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

function createDropHistory(
  instrumentId: string,
  previousClose: number,
  latestClose: number
): DashboardMarketDataPoint[] {
  return [
    ...createHistory(instrumentId, 209, previousClose),
    createMarketPoint(instrumentId, "2026-05-12", latestClose)
  ];
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
