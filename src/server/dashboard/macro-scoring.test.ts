import { describe, expect, it } from "vitest";

import { scoreMacroEnvironment } from "./macro-scoring";
import type {
  DashboardMacroObservation,
  DashboardMarketDataPoint
} from "./types";

describe("scoreMacroEnvironment", () => {
  it("returns insufficient instead of forcing a macro judgment", () => {
    const macro = scoreMacroEnvironment({
      macroObservations: [],
      marketSeries: []
    });

    expect(macro.status).toBe("insufficient");
    expect(macro.marketRiskScore).toBeNull();
    expect(macro.action.kind).toBe("refresh_data");
  });

  it("lets VIX above 25 raise both market risk and rebound opportunity", () => {
    const macro = scoreMacroEnvironment({
      macroObservations: [
        createObservation("VIXCLS", 26.4),
        createObservation("DGS10", 4.6)
      ],
      marketSeries: [
        {
          points: createTwoPointSeries("instrument_qqq", 100, 97),
          symbol: "QQQ"
        }
      ]
    });

    expect(macro.status).toBe("panic_watch");
    expect(macro.marketRiskScore).toBeGreaterThanOrEqual(70);
    expect(macro.reboundOpportunityScore).toBeGreaterThanOrEqual(35);
    expect(macro.panicReboundMode.state).toBe("active");
    expect(macro.reboundReasons.join(" ")).toContain("VIX 高于 25");
  });

  it("keeps panic rebound mode in watch state without broad market drop confirmation", () => {
    const macro = scoreMacroEnvironment({
      macroObservations: [createObservation("VIXCLS", 28)],
      marketSeries: []
    });

    expect(macro.status).toBe("panic_watch");
    expect(macro.panicReboundMode.state).toBe("watch");
    expect(macro.panicReboundMode.risks.join(" ")).toContain("SPY/QQQ");
  });
});

function createObservation(
  seriesId: string,
  value: number
): DashboardMacroObservation {
  return {
    date: "2026-05-12",
    ingestionRunId: "run_macro",
    provider: "fred",
    seriesId,
    unit: seriesId === "DGS10" ? "percent" : "index",
    updatedAt: new Date("2026-05-12T22:00:00.000Z"),
    value
  };
}

function createTwoPointSeries(
  instrumentId: string,
  previousClose: number,
  latestClose: number
): DashboardMarketDataPoint[] {
  return [
    createMarketPoint(instrumentId, "2026-05-11", previousClose),
    createMarketPoint(instrumentId, "2026-05-12", latestClose)
  ];
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
