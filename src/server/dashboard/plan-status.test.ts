import { describe, expect, it } from "vitest";

import {
  calculateCurrentPlanStatus,
  calculateHistoricalPlanStatus
} from "./plan-status";
import type {
  DashboardDecisionKeyLevelSnapshot,
  DashboardMarketDataPoint,
  KeyLevelProximitySnapshot
} from "./types";

describe("plan status tracking", () => {
  it("marks a current target as triggered when price is inside a constructive key level threshold", () => {
    const status = calculateCurrentPlanStatus({
      actionKind: "consider_small_add",
      basisDate: "2026-05-12",
      keyLevels: [
        createProximity({
          distancePercent: -2,
          levelType: "long_term_add",
          price: 300,
          state: "near",
          thresholdPercent: 3
        })
      ],
      latestPrice: 294,
      latestPriceDate: "2026-05-12"
    });

    expect(status).toMatchObject({
      distancePercent: -2,
      latestPrice: 294,
      levelPrice: 300,
      status: "triggered"
    });
    expect(status.message).toContain("触发");
  });

  it("marks a current target as approaching when price is close but not inside the trigger threshold", () => {
    const status = calculateCurrentPlanStatus({
      actionKind: "watch_key_level",
      basisDate: "2026-05-12",
      keyLevels: [
        createProximity({
          distancePercent: 5,
          levelType: "watch",
          price: 300,
          state: "above",
          thresholdPercent: 3
        })
      ],
      latestPrice: 315,
      latestPriceDate: "2026-05-12"
    });

    expect(status).toMatchObject({
      distancePercent: 5,
      status: "approaching"
    });
    expect(status.message).toContain("接近");
  });

  it("marks a current target as invalidated when support is broken beyond the threshold", () => {
    const status = calculateCurrentPlanStatus({
      actionKind: "risk_control",
      basisDate: "2026-05-12",
      keyLevels: [
        createProximity({
          distancePercent: -4,
          levelType: "support",
          price: 300,
          state: "below",
          thresholdPercent: 3
        })
      ],
      latestPrice: 288,
      latestPriceDate: "2026-05-12"
    });

    expect(status).toMatchObject({
      levelType: "support",
      status: "invalidated"
    });
    expect(status.message).toContain("失效");
  });

  it("marks missing price or key levels as insufficient data", () => {
    const status = calculateCurrentPlanStatus({
      actionKind: "wait",
      basisDate: null,
      keyLevels: [],
      latestPrice: null,
      latestPriceDate: null
    });

    expect(status).toMatchObject({
      latestPrice: null,
      levelPrice: null,
      status: "insufficient_data"
    });
  });

  it("marks missing basis date as insufficient even when price and key levels are available", () => {
    const status = calculateCurrentPlanStatus({
      actionKind: "consider_small_add",
      basisDate: null,
      keyLevels: [
        createProximity({
          distancePercent: -2,
          levelType: "long_term_add",
          price: 300,
          state: "near",
          thresholdPercent: 3
        })
      ],
      latestPrice: 294,
      latestPriceDate: "2026-05-12"
    });

    expect(status).toMatchObject({
      latestPrice: 294,
      latestPriceDate: "2026-05-12",
      levelPrice: null,
      status: "insufficient_data"
    });
    expect(status.message).toContain("basis date");
  });

  it("calculates historical plan status from persisted key levels and normalized prices", () => {
    const status = calculateHistoricalPlanStatus({
      actionKind: "consider_small_add",
      asOfDate: "2026-05-12",
      basisDate: "2026-05-01",
      instrumentId: "instrument_QQQ",
      keyLevels: [
        createHistoricalLevel({
          levelType: "long_term_add",
          price: 105,
          thresholdPercent: 3
        })
      ],
      marketData: createMarketHistory("instrument_QQQ", "2026-05-01", 7, 100)
    });

    expect(status).toMatchObject({
      latestPrice: 106,
      latestPriceDate: "2026-05-11",
      levelPrice: 105,
      status: "triggered"
    });
    expect(status.message).not.toContain("成功");
    expect(status.message).not.toContain("失败");
  });

  it("marks historical plan status as insufficient when basis date is missing", () => {
    const status = calculateHistoricalPlanStatus({
      actionKind: "consider_small_add",
      asOfDate: "2026-05-12",
      basisDate: null,
      instrumentId: "instrument_QQQ",
      keyLevels: [
        createHistoricalLevel({
          levelType: "long_term_add",
          price: 105,
          thresholdPercent: 3
        })
      ],
      marketData: createMarketHistory("instrument_QQQ", "2026-05-01", 7, 100)
    });

    expect(status).toMatchObject({
      latestPrice: 106,
      latestPriceDate: "2026-05-11",
      levelPrice: null,
      status: "insufficient_data"
    });
  });
});

function createProximity({
  distancePercent,
  levelType,
  price,
  state,
  thresholdPercent
}: {
  distancePercent: number;
  levelType: KeyLevelProximitySnapshot["level"]["levelType"];
  price: number;
  state: KeyLevelProximitySnapshot["state"];
  thresholdPercent: number;
}): KeyLevelProximitySnapshot {
  return {
    distancePercent,
    distanceText: `${distancePercent > 0 ? "+" : ""}${distancePercent.toFixed(1)}%`,
    isNear: state === "near",
    level: {
      currency: "USD",
      id: `level_${levelType}_${price}`,
      instrument: {
        assetType: "etf",
        currency: "USD",
        exchange: null,
        id: "instrument_QQQ",
        name: null,
        symbol: "QQQ"
      },
      levelType,
      notes: null,
      price,
      updatedAt: new Date("2026-05-12T12:00:00.000Z")
    },
    state,
    thresholdPercent
  };
}

function createHistoricalLevel({
  levelType,
  price,
  thresholdPercent
}: {
  levelType: DashboardDecisionKeyLevelSnapshot["levelType"];
  price: number;
  thresholdPercent: number;
}): DashboardDecisionKeyLevelSnapshot {
  return {
    currency: "USD",
    distancePercent: 0,
    levelType,
    price,
    state: "near",
    thresholdPercent
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
