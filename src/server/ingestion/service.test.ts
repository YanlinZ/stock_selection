import { describe, expect, it } from "vitest";

import {
  createFmpHistoricalPricesFailure,
  createFmpHistoricalPricesResponse,
  createFredSeriesObservationsResponse,
  type DailyMarketDataProvider,
  type MacroObservationProvider
} from "@/server/providers";

import { createIngestionService } from "./service";
import type {
  CreateIngestionRunInput,
  DataStatusSnapshot,
  FinishIngestionRunInput,
  IngestionRefreshPlan,
  IngestionRunRecord,
  MacroObservationRecord,
  MarketDataDailyRecord,
  ProviderRawResponseRecord,
  SaveRawResponseInput,
  UpsertMacroObservationPointsInput,
  UpsertMarketDataPointsInput
} from "./types";
import type { IngestionRepository } from "./repository";

describe("createIngestionService", () => {
  it("saves raw provider responses, normalized points, and successful run state", async () => {
    const fake = createFakeIngestionRepository({
      macroObservations: [],
      marketData: [createMarketTarget("instrument_tsla", "TSLA", "fmp")]
    });
    const service = createIngestionService({
      clock: createFixedClock(),
      providers: createProviders(),
      repository: fake.repository
    });

    const result = await service.refreshAll({ requestedBy: "test" });

    expect(result.status).toBe("success");
    expect(fake.runs.filter((run) => run.provider === "fmp")).toHaveLength(1);
    expect(fake.rawResponses).toHaveLength(1);
    expect(fake.marketDataRows).toHaveLength(1);
    expect(fake.marketDataRows[0]).toMatchObject({
      close: "292.5",
      date: "2026-05-08",
      instrumentId: "instrument_tsla",
      provider: "fmp"
    });
  });

  it("upserts duplicate symbol/date refreshes without duplicating normalized data", async () => {
    const fake = createFakeIngestionRepository({
      macroObservations: [],
      marketData: [createMarketTarget("instrument_tsla", "TSLA", "fmp")]
    });
    const service = createIngestionService({
      clock: createFixedClock(),
      providers: createProviders(),
      repository: fake.repository
    });

    await service.refreshAll({ requestedBy: "test" });
    await service.refreshAll({ requestedBy: "test" });

    expect(fake.rawResponses).toHaveLength(2);
    expect(fake.marketDataRows).toHaveLength(1);
    expect(fake.marketDataRows[0]?.rawResponseId).toBe(fake.rawResponses[1]?.id);
  });

  it("records provider failure responses as failed runs without throwing", async () => {
    const fake = createFakeIngestionRepository({
      macroObservations: [],
      marketData: [createMarketTarget("instrument_msft", "MSFT", "fmp")]
    });
    const providers = createProviders({
      fmp: {
        provider: "fmp",
        async getDailyPrices(input) {
          return createFmpHistoricalPricesFailure({
            errorMessage: "Rate limit exceeded.",
            responseStatus: 429,
            symbol: input.symbol
          });
        }
      }
    });
    const service = createIngestionService({
      clock: createFixedClock(),
      providers,
      repository: fake.repository
    });

    const result = await service.refreshAll({ requestedBy: "test" });

    expect(result.status).toBe("failed");
    expect(result.results[0]).toMatchObject({
      errorMessage: "Rate limit exceeded.",
      pointsWritten: 0,
      status: "failed"
    });
    expect(fake.rawResponses[0]).toMatchObject({
      errorMessage: "Rate limit exceeded.",
      responseStatus: 429
    });
    expect(fake.marketDataRows).toHaveLength(0);
  });

  it("marks a batch as partial_success when only some targets fail", async () => {
    const fake = createFakeIngestionRepository({
      macroObservations: [{ provider: "fred", seriesId: "DGS10", unit: "percent" }],
      marketData: [createMarketTarget("instrument_tsla", "TSLA", "fmp")]
    });
    const providers = createProviders({
      fred: {
        provider: "fred",
        async getMacroObservations() {
          throw new Error("FRED test outage.");
        }
      }
    });
    const service = createIngestionService({
      clock: createFixedClock(),
      providers,
      repository: fake.repository
    });

    const result = await service.refreshAll({ requestedBy: "test" });

    expect(result.status).toBe("partial_success");
    expect(result.summary).toMatchObject({
      failedTargets: 1,
      failedTargetDetails: [
        {
          errorMessage: "FRED test outage.",
          provider: "fred",
          targetKind: "macro_observation",
          targetSymbol: "DGS10"
        }
      ],
      successfulTargets: 1,
      totalTargets: 2
    });
    expect(fake.runs.find((run) => run.provider === "manual")).toMatchObject({
      errorMessage:
        "1 refresh target(s) failed: FRED macro_observation DGS10: FRED test outage.",
      status: "partial_success"
    });
  });

  it("requests enough default history for MA200 calculations", async () => {
    const requests: Array<{ endDate?: string; startDate?: string }> = [];
    const fake = createFakeIngestionRepository({
      macroObservations: [],
      marketData: [createMarketTarget("instrument_googl", "GOOGL", "fmp")]
    });
    const providers = createProviders({
      fmp: {
        provider: "fmp",
        async getDailyPrices(input) {
          requests.push({
            endDate: input.endDate,
            startDate: input.startDate
          });

          return createFmpHistoricalPricesResponse({
            payload: [
              {
                close: 100,
                date: input.endDate ?? "2026-05-11",
                volume: 1000
              }
            ],
            symbol: input.symbol
          });
        }
      }
    });
    const service = createIngestionService({
      clock: createFixedClock(),
      providers,
      repository: fake.repository
    });

    await service.refreshAll({ requestedBy: "test" });

    expect(requests).toEqual([
      {
        endDate: "2026-05-11",
        startDate: "2025-05-11"
      }
    ]);
  });
});

function createProviders(
  overrides: Partial<{
    coingecko: DailyMarketDataProvider;
    fmp: DailyMarketDataProvider;
    fred: MacroObservationProvider;
  }> = {}
) {
  const defaults: {
    coingecko: DailyMarketDataProvider;
    fmp: DailyMarketDataProvider;
    fred: MacroObservationProvider;
  } = {
    coingecko: {
      provider: "coingecko" as const,
      async getDailyPrices(input) {
        return createFmpHistoricalPricesResponse({
          payload: [
            {
              close: 61000,
              date: "2026-05-08",
              volume: 100
            }
          ],
          symbol: input.symbol
        });
      }
    },
    fmp: {
      provider: "fmp" as const,
      async getDailyPrices(input) {
        return createFmpHistoricalPricesResponse({
          payload: [
            {
              adjClose: 292.18,
              close: 292.5,
              date: "2026-05-08",
              high: 300.25,
              low: 288.4,
              open: 296.2,
              volume: 123456789
            }
          ],
          symbol: input.symbol
        });
      }
    },
    fred: {
      provider: "fred" as const,
      async getMacroObservations(input) {
        return createFredSeriesObservationsResponse({
          payload: {
            observations: [
              {
                date: "2026-05-08",
                value: "4.23"
              }
            ],
            units: input.unit ?? "percent"
          },
          seriesId: input.seriesId
        });
      }
    },
  };

  return {
    ...defaults,
    ...overrides
  };
}

function createFakeIngestionRepository(plan: IngestionRefreshPlan) {
  let idSequence = 0;
  const timestamp = new Date("2026-05-11T00:00:00.000Z");
  const runs: IngestionRunRecord[] = [];
  const rawResponses: ProviderRawResponseRecord[] = [];
  const marketDataRows = new Map<string, MarketDataDailyRecord>();
  const macroObservationRows = new Map<string, MacroObservationRecord>();
  const nextId = (prefix: string) => `${prefix}_${++idSequence}`;

  const repository: IngestionRepository = {
    async createRun(input: CreateIngestionRunInput) {
      const run: IngestionRunRecord = {
        createdAt: timestamp,
        errorMessage: null,
        finishedAt: null,
        id: nextId("run"),
        provider: input.provider,
        requestedBy: input.requestedBy,
        startedAt: input.startedAt ?? timestamp,
        status: "running",
        summary: {},
        targetKind: input.targetKind,
        targetSymbol: input.targetSymbol
      };

      runs.push(run);

      return run;
    },

    async finishRun(input: FinishIngestionRunInput) {
      const run = requireRecord(
        runs.find((item) => item.id === input.id),
        "Run not found."
      );

      run.errorMessage = input.errorMessage ?? null;
      run.finishedAt = input.finishedAt ?? timestamp;
      run.status = input.status;
      run.summary = input.summary;

      return run;
    },

    async getDataStatus(): Promise<DataStatusSnapshot> {
      return {
        batchRun: null,
        generatedAt: timestamp.toISOString(),
        providers: []
      };
    },

    async getRefreshPlan() {
      return plan;
    },

    async saveRawResponse(input: SaveRawResponseInput) {
      const rawResponse: ProviderRawResponseRecord = {
        createdAt: timestamp,
        endpoint: input.rawResponse.request.endpoint,
        errorMessage: input.rawResponse.errorMessage,
        fetchedAt: new Date(input.rawResponse.fetchedAt),
        id: nextId("raw"),
        ingestionRunId: input.ingestionRunId,
        payload: input.rawResponse.payload,
        provider: input.rawResponse.request.provider,
        requestKey: input.rawResponse.request.requestKey,
        requestParams: input.rawResponse.request.params,
        responseStatus: input.rawResponse.responseStatus
      };

      rawResponses.push(rawResponse);

      return rawResponse;
    },

    async upsertMarketDataPoints(input: UpsertMarketDataPointsInput) {
      for (const point of input.points) {
        marketDataRows.set(
            `${input.instrumentId}:${point.sourceProvider}:${point.date}`,
            {
              adjustedClose: stringifyNumber(point.adjustedClose),
              close: String(point.close),
            createdAt: timestamp,
            date: point.date,
            high: stringifyNumber(point.high),
            id:
              marketDataRows.get(
                `${input.instrumentId}:${point.sourceProvider}:${point.date}`
              )?.id ?? nextId("market"),
            ingestionRunId: input.ingestionRunId,
            instrumentId: input.instrumentId,
            low: stringifyNumber(point.low),
            open: stringifyNumber(point.open),
            provider: point.sourceProvider,
            rawResponseId: input.rawResponseId,
            updatedAt: timestamp,
            volume: stringifyNumber(point.volume)
          }
        );
      }

      return input.points.length;
    },

    async upsertMacroObservationPoints(input: UpsertMacroObservationPointsInput) {
      for (const point of input.points) {
        macroObservationRows.set(
          `${point.seriesId}:${point.sourceProvider}:${point.date}`,
          {
            createdAt: timestamp,
            date: point.date,
            id:
              macroObservationRows.get(
                `${point.seriesId}:${point.sourceProvider}:${point.date}`
              )?.id ?? nextId("macro"),
            ingestionRunId: input.ingestionRunId,
            provider: point.sourceProvider,
            rawResponseId: input.rawResponseId,
            seriesId: point.seriesId,
            unit: point.unit,
            updatedAt: timestamp,
            value: String(point.value)
          }
        );
      }

      return input.points.length;
    }
  };

  return {
    get macroObservationRows() {
      return [...macroObservationRows.values()];
    },
    get marketDataRows() {
      return [...marketDataRows.values()];
    },
    rawResponses,
    repository,
    runs
  };
}

function createMarketTarget(
  instrumentId: string,
  symbol: string,
  provider: "coingecko" | "fmp"
) {
  return {
    assetType: provider === "coingecko" ? ("crypto" as const) : ("stock" as const),
    currency: "USD",
    instrumentId,
    provider,
    providerMetadata: {},
    symbol
  };
}

function createFixedClock() {
  return {
    now: () => new Date("2026-05-11T12:00:00.000Z")
  };
}

function stringifyNumber(value: number | null) {
  return value === null ? null : String(value);
}

function requireRecord<T>(record: T | undefined, message: string): T {
  if (!record) {
    throw new Error(message);
  }

  return record;
}
