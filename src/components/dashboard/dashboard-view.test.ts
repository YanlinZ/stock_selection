import { describe, expect, it } from "vitest";

import { createDashboardSnapshot } from "@/server/dashboard/service";

import { DashboardView } from "./dashboard-view";

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
      new Date("2026-05-13T12:00:00.000Z")
    );

    expect(() => DashboardView({ snapshot })).not.toThrow();
  });
});
