import { describe, expect, it } from "vitest";

import {
  calculateKeyLevelProximities,
  calculateMovingAverages,
  calculateRecentRange,
  calculateVolumeChange
} from "./indicators";
import type { DashboardKeyPriceLevelInput, DashboardMarketDataPoint } from "./types";

describe("dashboard technical indicators", () => {
  it("calculates moving averages, recent range, and volume change", () => {
    const points = createMarketPoints(210);

    const movingAverages = calculateMovingAverages(points);
    const recentRange = calculateRecentRange(points, 60);
    const volumeChange = calculateVolumeChange(points, 20);

    expect(movingAverages[8]).toMatchObject({
      status: "ready",
      value: 206.5
    });
    expect(movingAverages[200]).toMatchObject({
      status: "ready",
      value: 110.5
    });
    expect(recentRange).toMatchObject({
      high: 211,
      highDate: "2026-07-29",
      low: 150,
      lowDate: "2026-05-31",
      status: "ready"
    });
    expect(volumeChange.status).toBe("ready");
    expect(volumeChange.percent).toBeGreaterThan(0);
  });

  it("returns unavailable indicators when history is insufficient", () => {
    const movingAverages = calculateMovingAverages(createMarketPoints(7));

    expect(movingAverages[8]).toMatchObject({
      status: "unavailable",
      value: null
    });
  });

  it("detects key price level proximity with asset-specific thresholds", () => {
    const stockLevels = calculateKeyLevelProximities({
      assetType: "stock",
      keyLevels: [createKeyLevel({ price: 300, symbol: "TSLA" })],
      latestPrice: 292
    });
    const cryptoLevels = calculateKeyLevelProximities({
      assetType: "crypto",
      keyLevels: [createKeyLevel({ price: 60000, symbol: "BTC" })],
      latestPrice: 57500
    });

    expect(stockLevels[0]).toMatchObject({
      isNear: true,
      state: "near"
    });
    expect(cryptoLevels[0]).toMatchObject({
      isNear: true,
      thresholdPercent: 5
    });
  });
});

function createMarketPoints(count: number): DashboardMarketDataPoint[] {
  const start = new Date("2026-01-01T00:00:00.000Z");

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const close = index + 1;

    return {
      adjustedClose: close,
      close,
      date: date.toISOString().slice(0, 10),
      high: close + 1,
      ingestionRunId: "run_market",
      instrumentId: "instrument_tsla",
      low: close - 1,
      open: close - 0.5,
      provider: "fmp",
      updatedAt: new Date(`${date.toISOString().slice(0, 10)}T21:00:00.000Z`),
      volume: 1000 + index
    };
  });
}

function createKeyLevel({
  price,
  symbol
}: {
  price: number;
  symbol: string;
}): DashboardKeyPriceLevelInput {
  return {
    currency: "USD",
    id: `level_${symbol}`,
    instrument: {
      assetType: symbol === "BTC" ? "crypto" : "stock",
      currency: "USD",
      exchange: null,
      id: `instrument_${symbol}`,
      name: null,
      symbol
    },
    levelType: "long_term_add",
    notes: null,
    price,
    updatedAt: new Date("2026-05-13T12:00:00.000Z")
  };
}
