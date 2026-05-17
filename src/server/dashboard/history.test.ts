import { describe, expect, it } from "vitest";

import { createDashboardHistorySnapshot } from "./history";
import type {
  DashboardDecisionSnapshotRecord,
  DashboardMarketDataPoint
} from "./types";

describe("createDashboardHistorySnapshot", () => {
  it("returns a stable empty history state", () => {
    const history = createDashboardHistorySnapshot(
      {
        decisionSnapshots: [],
        marketData: []
      },
      {
        asOfDate: "2026-05-16",
        generatedAt: new Date("2026-05-16T12:00:00.000Z")
      }
    );

    expect(history).toEqual({
      entries: [],
      generatedAt: "2026-05-16T12:00:00.000Z",
      reviewTasks: [],
      status: "empty"
    });
  });

  it("preserves decision context and attaches normalized price outcomes", () => {
    const history = createDashboardHistorySnapshot(
      {
        decisionSnapshots: [
          createRecord({
            actionLabel: "今日重点观察：QQQ",
            confidence: "high",
            dataQuality: "complete",
            generatedAt: new Date("2026-05-01T13:00:00.000Z"),
            instrumentId: "instrument_QQQ",
            keyLevels: [
              {
                currency: "USD",
                distancePercent: 0,
                levelType: "long_term_add",
                price: 105,
                state: "near",
                thresholdPercent: 3
              }
            ],
            scope: "opportunity",
            snapshotDate: "2026-05-01",
            subjectKey: "instrument_QQQ",
            symbol: "QQQ"
          })
        ],
        marketData: createMarketHistory("instrument_QQQ", "2026-05-01", 7, 100)
      },
      {
        asOfDate: "2026-05-12",
        generatedAt: new Date("2026-05-16T12:00:00.000Z")
      }
    );

    expect(history.status).toBe("ready");
    expect(history.entries[0]).toMatchObject({
      actionLabel: "今日重点观察：QQQ",
      basisDate: "2026-05-01",
      confidence: "high",
      dataQuality: "complete",
      ruleVersion: "dashboard-rules-v4.0.0",
      scope: "opportunity",
      subjectKey: "instrument_QQQ",
      symbol: "QQQ",
      planStatus: expect.objectContaining({
        latestPrice: 106,
        latestPriceDate: "2026-05-11",
        levelPrice: 105,
        status: "triggered"
      })
    });
    expect(history.entries[0]?.outcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          returnPercent: 1,
          status: "ready",
          tradingDays: 1
        }),
        expect.objectContaining({
          status: "ready",
          tradingDays: 5
        }),
        expect.objectContaining({
          status: "pending",
          tradingDays: 20
        })
      ])
    );
    expect(history.reviewTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionLabel: "今日重点观察：QQQ",
          message: "已到 1D 观察窗口，可人工复盘。",
          planStatus: expect.objectContaining({
            status: "triggered"
          }),
          status: "ready",
          tradingDays: 1
        }),
        expect.objectContaining({
          message: "等待 20 个交易日后的 normalized price，再进行人工复盘。",
          status: "pending",
          tradingDays: 20
        })
      ])
    );
  });

  it("sorts entries by snapshot date, generated time, scope, and symbol", () => {
    const history = createDashboardHistorySnapshot(
      {
        decisionSnapshots: [
          createRecord({
            generatedAt: new Date("2026-05-01T10:00:00.000Z"),
            scope: "holding",
            snapshotDate: "2026-05-01",
            symbol: "TSLA"
          }),
          createRecord({
            generatedAt: new Date("2026-05-02T09:00:00.000Z"),
            scope: "summary",
            snapshotDate: "2026-05-02",
            subjectKey: "summary",
            symbol: null
          }),
          createRecord({
            generatedAt: new Date("2026-05-01T12:00:00.000Z"),
            scope: "opportunity",
            snapshotDate: "2026-05-01",
            symbol: "QQQ"
          })
        ],
        marketData: []
      },
      {
        asOfDate: "2026-05-16",
        generatedAt: new Date("2026-05-16T12:00:00.000Z")
      }
    );

    expect(history.entries.map((entry) => `${entry.snapshotDate}:${entry.scope}`))
      .toEqual(["2026-05-02:summary", "2026-05-01:opportunity", "2026-05-01:holding"]);
  });

  it("keeps history plan status insufficient when a persisted snapshot lacks basis date", () => {
    const history = createDashboardHistorySnapshot(
      {
        decisionSnapshots: [
          createRecord({
            basisDate: null,
            instrumentId: "instrument_QQQ",
            keyLevels: [
              {
                currency: "USD",
                distancePercent: 0,
                levelType: "long_term_add",
                price: 105,
                state: "near",
                thresholdPercent: 3
              }
            ],
            scope: "opportunity",
            symbol: "QQQ"
          })
        ],
        marketData: createMarketHistory("instrument_QQQ", "2026-05-01", 7, 100)
      },
      {
        asOfDate: "2026-05-12",
        generatedAt: new Date("2026-05-16T12:00:00.000Z")
      }
    );

    expect(history.entries[0]?.planStatus).toMatchObject({
      latestPrice: 106,
      latestPriceDate: "2026-05-11",
      levelPrice: null,
      status: "insufficient_data"
    });
  });
});

function createRecord(
  overrides: Partial<DashboardDecisionSnapshotRecord> = {}
): DashboardDecisionSnapshotRecord {
  return {
    actionKind: "consider_small_add",
    actionLabel: "小仓观察 TSLA",
    basisDate: "2026-05-01",
    confidence: "medium",
    dataQuality: "partial",
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
      points.push({
        adjustedClose: firstClose + points.length,
        close: firstClose + points.length,
        date: date.toISOString().slice(0, 10),
        high: firstClose + points.length + 1,
        ingestionRunId: "run_market",
        instrumentId,
        low: firstClose + points.length - 1,
        open: firstClose + points.length,
        provider: "fmp",
        updatedAt: new Date(`${date.toISOString().slice(0, 10)}T21:00:00.000Z`),
        volume: 1000
      });
    }

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return points;
}
