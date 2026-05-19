import {
  createCoinGeckoProvider,
  createFmpProvider,
  createFredProvider
} from "@/server/providers/real";
import type {
  DailyMarketDataProvider,
  MacroObservationProvider
} from "@/server/providers";

import {
  createIngestionRepository,
  type IngestionRepository
} from "./repository";
import type {
  DataStatusSnapshot,
  IngestionStatus,
  MacroObservationIngestionTarget,
  MarketDataIngestionTarget,
  RefreshAllResult,
  RefreshSummary,
  RefreshTargetResult
} from "./types";

type IngestionProviders = {
  coingecko: DailyMarketDataProvider;
  fmp: DailyMarketDataProvider;
  fred: MacroObservationProvider;
};

type RefreshAllInput = {
  endDate?: string;
  requestedBy?: string;
  startDate?: string;
};

type Clock = {
  now(): Date;
};

const defaultClock: Clock = {
  now: () => new Date()
};

const defaultLookbackDays = 45;

export function createIngestionService({
  clock = defaultClock,
  providers = createRealProviderRegistry(),
  repository = createIngestionRepository()
}: {
  clock?: Clock;
  providers?: IngestionProviders;
  repository?: IngestionRepository;
} = {}) {
  async function refreshAll(input: RefreshAllInput = {}): Promise<RefreshAllResult> {
    const requestedBy = input.requestedBy ?? "manual";
    const dateRange =
      input.startDate && input.endDate
        ? { endDate: input.endDate, startDate: input.startDate }
        : getDefaultDateRange(clock.now());
    const batchStartedAt = clock.now();
    const batchRun = await repository.createRun({
      provider: "manual",
      requestedBy,
      startedAt: batchStartedAt,
      targetKind: "refresh_all",
      targetSymbol: null
    });

    try {
      const plan = await repository.getRefreshPlan();
      const results: RefreshTargetResult[] = [];

      for (const target of plan.marketData) {
        results.push(
          await refreshMarketDataTarget({
            dateRange,
            requestedBy,
            target
          })
        );
      }

      for (const target of plan.macroObservations) {
        results.push(
          await refreshMacroObservationTarget({
            dateRange,
            requestedBy,
            target
          })
        );
      }

      const summary = createRefreshSummary({
        macroTargets: plan.macroObservations.length,
        marketTargets: plan.marketData.length,
        results
      });
      const status = resolveBatchStatus(summary);
      const errorMessage =
        status === "success" ? null : createBatchErrorMessage(summary);

      await repository.finishRun({
        errorMessage,
        finishedAt: clock.now(),
        id: batchRun.id,
        status,
        summary: {
          ...summary,
          durationMs: clock.now().getTime() - batchStartedAt.getTime()
        }
      });

      return {
        batchRunId: batchRun.id,
        results,
        status,
        summary
      };
    } catch (error) {
      const errorMessage = normalizeErrorMessage(error);
      const summary: RefreshSummary = {
        failedTargetDetails: [],
        failedTargets: 1,
        macroTargets: 0,
        marketTargets: 0,
        pointsReceived: 0,
        pointsWritten: 0,
        successfulTargets: 0,
        totalTargets: 1
      };

      await repository.finishRun({
        errorMessage,
        finishedAt: clock.now(),
        id: batchRun.id,
        status: "failed",
        summary
      });

      return {
        batchRunId: batchRun.id,
        results: [],
        status: "failed",
        summary
      };
    }
  }

  async function refreshMarketDataTarget(input: {
    dateRange: { endDate: string; startDate: string };
    requestedBy: string;
    target: MarketDataIngestionTarget;
  }): Promise<RefreshTargetResult> {
    const runStartedAt = clock.now();
    const run = await repository.createRun({
      provider: input.target.provider,
      requestedBy: input.requestedBy,
      startedAt: runStartedAt,
      targetKind: "daily_market_data",
      targetSymbol: input.target.symbol
    });

    try {
      const response = await providers[input.target.provider].getDailyPrices({
        currency: input.target.currency,
        endDate: input.dateRange.endDate,
        providerMetadata: input.target.providerMetadata,
        startDate: input.dateRange.startDate,
        symbol: input.target.symbol
      });

      const rawResponse = await repository.saveRawResponse({
        ingestionRunId: run.id,
        rawResponse: response.rawResponse
      });

      if (response.rawResponse.errorMessage) {
        return finishTargetRun({
          errorMessage: response.rawResponse.errorMessage,
          pointsReceived: response.points.length,
          pointsWritten: 0,
          provider: input.target.provider,
          rawResponseId: rawResponse.id,
          runId: run.id,
          runStartedAt,
          status: "failed",
          targetKind: "daily_market_data",
          targetSymbol: input.target.symbol
        });
      }

      const pointsWritten = await repository.upsertMarketDataPoints({
        ingestionRunId: run.id,
        instrumentId: input.target.instrumentId,
        points: response.points,
        rawResponseId: rawResponse.id
      });

      return finishTargetRun({
        errorMessage: null,
        pointsReceived: response.points.length,
        pointsWritten,
        provider: input.target.provider,
        rawResponseId: rawResponse.id,
        runId: run.id,
        runStartedAt,
        status: "success",
        targetKind: "daily_market_data",
        targetSymbol: input.target.symbol
      });
    } catch (error) {
      return finishTargetRun({
        errorMessage: normalizeErrorMessage(error),
        pointsReceived: 0,
        pointsWritten: 0,
        provider: input.target.provider,
        rawResponseId: null,
        runId: run.id,
        runStartedAt,
        status: "failed",
        targetKind: "daily_market_data",
        targetSymbol: input.target.symbol
      });
    }
  }

  async function refreshMacroObservationTarget(input: {
    dateRange: { endDate: string; startDate: string };
    requestedBy: string;
    target: MacroObservationIngestionTarget;
  }): Promise<RefreshTargetResult> {
    const runStartedAt = clock.now();
    const run = await repository.createRun({
      provider: input.target.provider,
      requestedBy: input.requestedBy,
      startedAt: runStartedAt,
      targetKind: "macro_observation",
      targetSymbol: input.target.seriesId
    });

    try {
      const response = await providers.fred.getMacroObservations({
        endDate: input.dateRange.endDate,
        seriesId: input.target.seriesId,
        startDate: input.dateRange.startDate,
        unit: input.target.unit ?? undefined
      });

      const rawResponse = await repository.saveRawResponse({
        ingestionRunId: run.id,
        rawResponse: response.rawResponse
      });

      if (response.rawResponse.errorMessage) {
        return finishTargetRun({
          errorMessage: response.rawResponse.errorMessage,
          pointsReceived: response.points.length,
          pointsWritten: 0,
          provider: input.target.provider,
          rawResponseId: rawResponse.id,
          runId: run.id,
          runStartedAt,
          status: "failed",
          targetKind: "macro_observation",
          targetSymbol: input.target.seriesId
        });
      }

      const pointsWritten = await repository.upsertMacroObservationPoints({
        ingestionRunId: run.id,
        points: response.points,
        rawResponseId: rawResponse.id
      });

      return finishTargetRun({
        errorMessage: null,
        pointsReceived: response.points.length,
        pointsWritten,
        provider: input.target.provider,
        rawResponseId: rawResponse.id,
        runId: run.id,
        runStartedAt,
        status: "success",
        targetKind: "macro_observation",
        targetSymbol: input.target.seriesId
      });
    } catch (error) {
      return finishTargetRun({
        errorMessage: normalizeErrorMessage(error),
        pointsReceived: 0,
        pointsWritten: 0,
        provider: input.target.provider,
        rawResponseId: null,
        runId: run.id,
        runStartedAt,
        status: "failed",
        targetKind: "macro_observation",
        targetSymbol: input.target.seriesId
      });
    }
  }

  async function finishTargetRun(input: RefreshTargetResult & { runStartedAt: Date }) {
    await repository.finishRun({
      errorMessage: input.errorMessage,
      finishedAt: clock.now(),
      id: input.runId,
      status: input.status,
      summary: {
        durationMs: clock.now().getTime() - input.runStartedAt.getTime(),
        pointsReceived: input.pointsReceived,
        pointsWritten: input.pointsWritten,
        rawResponseId: input.rawResponseId
      }
    });

    return {
      errorMessage: input.errorMessage,
      pointsReceived: input.pointsReceived,
      pointsWritten: input.pointsWritten,
      provider: input.provider,
      rawResponseId: input.rawResponseId,
      runId: input.runId,
      status: input.status,
      targetKind: input.targetKind,
      targetSymbol: input.targetSymbol
    };
  }

  return {
    getDataStatus(): Promise<DataStatusSnapshot> {
      return repository.getDataStatus(clock.now());
    },
    refreshAll
  };
}

function createRealProviderRegistry(): IngestionProviders {
  return {
    coingecko: createCoinGeckoProvider(),
    fmp: createFmpProvider(),
    fred: createFredProvider()
  };
}

function createRefreshSummary(input: {
  macroTargets: number;
  marketTargets: number;
  results: RefreshTargetResult[];
}): RefreshSummary {
  const failedTargetDetails = input.results
    .filter((result) => result.status === "failed")
    .map((result) => ({
      errorMessage: result.errorMessage ?? "Unknown ingestion error.",
      provider: result.provider,
      targetKind: result.targetKind,
      targetSymbol: result.targetSymbol
    }));

  return {
    failedTargetDetails,
    failedTargets: failedTargetDetails.length,
    macroTargets: input.macroTargets,
    marketTargets: input.marketTargets,
    pointsReceived: sum(input.results, (result) => result.pointsReceived),
    pointsWritten: sum(input.results, (result) => result.pointsWritten),
    successfulTargets: input.results.length - failedTargetDetails.length,
    totalTargets: input.results.length
  };
}

function createBatchErrorMessage(summary: RefreshSummary) {
  const detailText = summary.failedTargetDetails
    .slice(0, 3)
    .map(formatFailedTargetDetail)
    .join("; ");
  const remainingCount = Math.max(summary.failedTargets - 3, 0);
  const remainingText =
    remainingCount > 0 ? `; ${remainingCount} more target(s) failed` : "";

  if (!detailText) {
    return `${summary.failedTargets} refresh target(s) failed.`;
  }

  const message = `${summary.failedTargets} refresh target(s) failed: ${detailText}${remainingText}`;

  return /[.!?]$/.test(message) ? message : `${message}.`;
}

function formatFailedTargetDetail(
  detail: RefreshSummary["failedTargetDetails"][number]
) {
  const provider = detail.provider.toUpperCase();
  const target = detail.targetSymbol ? ` ${detail.targetSymbol}` : "";

  return `${provider} ${detail.targetKind}${target}: ${detail.errorMessage}`;
}

function resolveBatchStatus(summary: RefreshSummary): IngestionStatus {
  if (summary.failedTargets === 0) {
    return "success";
  }

  if (summary.successfulTargets === 0) {
    return "failed";
  }

  return "partial_success";
}

function getDefaultDateRange(now: Date) {
  const endDate = toDateString(now);
  const startDateTime = new Date(now);
  startDateTime.setUTCDate(startDateTime.getUTCDate() - defaultLookbackDays);

  return {
    endDate,
    startDate: toDateString(startDateTime)
  };
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sum<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown ingestion error.";
}

export type { IngestionProviders };
