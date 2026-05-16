import { describe, expect, it } from "vitest";

import { calculateDashboardHistoryOutcomes } from "./history-outcomes";
import type {
  DashboardDecisionSnapshotRecord,
  DashboardMarketDataPoint
} from "./types";

describe("calculateDashboardHistoryOutcomes", () => {
  it("calculates 1, 5, and 20 trading-day returns from normalized daily closes", () => {
    const outcomes = calculateDashboardHistoryOutcomes({
      asOfDate: "2026-06-01",
      marketData: createMarketHistory("instrument_TSLA", "2026-05-01", 22, 100),
      snapshot: createRecord({
        basisDate: "2026-05-01",
        instrumentId: "instrument_TSLA",
        symbol: "TSLA"
      })
    });

    expect(outcomes).toEqual([
      expect.objectContaining({
        entryClose: 100,
        entryDate: "2026-05-01",
        outcomeClose: 101,
        outcomeDate: "2026-05-04",
        returnPercent: 1,
        status: "ready",
        tradingDays: 1
      }),
      expect.objectContaining({
        entryClose: 100,
        outcomeClose: 105,
        returnPercent: 5,
        status: "ready",
        tradingDays: 5
      }),
      expect.objectContaining({
        entryClose: 100,
        outcomeClose: 120,
        returnPercent: 20,
        status: "ready",
        tradingDays: 20
      })
    ]);
  });

  it("uses the first available trading close on or after the basis date as entry", () => {
    const outcomes = calculateDashboardHistoryOutcomes({
      asOfDate: "2026-05-15",
      marketData: [
        createMarketPoint("instrument_TSLA", "2026-05-04", 102),
        createMarketPoint("instrument_TSLA", "2026-05-05", 103)
      ],
      snapshot: createRecord({
        basisDate: "2026-05-02",
        instrumentId: "instrument_TSLA"
      })
    });

    expect(outcomes[0]).toMatchObject({
      entryClose: 102,
      entryDate: "2026-05-04",
      outcomeClose: 103,
      outcomeDate: "2026-05-05",
      returnPercent: 0.9803921568627451,
      status: "ready"
    });
  });

  it("marks windows as pending when the entry exists but later trading days have not arrived", () => {
    const outcomes = calculateDashboardHistoryOutcomes({
      asOfDate: "2026-05-05",
      marketData: [
        createMarketPoint("instrument_TSLA", "2026-05-04", 100),
        createMarketPoint("instrument_TSLA", "2026-05-05", 101)
      ],
      snapshot: createRecord({
        basisDate: "2026-05-04",
        instrumentId: "instrument_TSLA"
      })
    });

    expect(outcomes).toEqual([
      expect.objectContaining({ status: "ready", tradingDays: 1 }),
      expect.objectContaining({ status: "pending", tradingDays: 5 }),
      expect.objectContaining({ status: "pending", tradingDays: 20 })
    ]);
  });

  it("marks outcomes insufficient when the entry price cannot be found in normalized data", () => {
    const outcomes = calculateDashboardHistoryOutcomes({
      asOfDate: "2026-05-20",
      marketData: [createMarketPoint("instrument_TSLA", "2026-04-30", 100)],
      snapshot: createRecord({
        basisDate: "2026-05-01",
        instrumentId: "instrument_TSLA"
      })
    });

    expect(outcomes).toEqual([
      expect.objectContaining({ status: "insufficient_data", tradingDays: 1 }),
      expect.objectContaining({ status: "insufficient_data", tradingDays: 5 }),
      expect.objectContaining({ status: "insufficient_data", tradingDays: 20 })
    ]);
  });
});

function createRecord(
  overrides: Partial<DashboardDecisionSnapshotRecord> = {}
): DashboardDecisionSnapshotRecord {
  return {
    actionKind: "consider_small_add",
    actionLabel: "小仓观察 TSLA",
    basisDate: "2026-05-01",
    confidence: "high",
    dataQuality: "complete",
    dataSources: [],
    evidence: {
      missing: [],
      opposing: [],
      risks: [],
      supporting: []
    },
    generatedAt: new Date("2026-05-01T12:00:00.000Z"),
    instrumentId: "instrument_TSLA",
    keyLevels: [],
    macroState: {},
    ruleVersion: "dashboard-rules-v4.0.0",
    scope: "holding",
    snapshotDate: "2026-05-01",
    subjectKey: "instrument_TSLA",
    symbol: "TSLA",
    ...overrides
  };
}

function createMarketHistory(
  instrumentId: string,
  startDate: string,
  count: number,
  firstClose: number
): DashboardMarketDataPoint[] {
  const points: DashboardMarketDataPoint[] = [];
  const date = new Date(`${startDate}T00:00:00.000Z`);

  while (points.length < count) {
    const day = date.getUTCDay();

    if (day !== 0 && day !== 6) {
      points.push(
        createMarketPoint(
          instrumentId,
          date.toISOString().slice(0, 10),
          firstClose + points.length
        )
      );
    }

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return points;
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
    high: close + 1,
    ingestionRunId: "run_market",
    instrumentId,
    low: close - 1,
    open: close,
    provider: "fmp",
    updatedAt: new Date(`${date}T21:00:00.000Z`),
    volume: 1000
  };
}
