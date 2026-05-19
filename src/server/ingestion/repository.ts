import { and, asc, count, desc, eq, max, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  holdings,
  ingestionRuns,
  instruments,
  keyPriceLevels,
  macroObservations,
  marketDataDaily,
  providerRawResponses,
  watchlistItems
} from "@/db/schema";
import { externalProviderNames } from "@/server/providers";
import { normalizeSymbol } from "@/server/providers/shared";

import type {
  CreateIngestionRunInput,
  DataProviderState,
  DataStatusSnapshot,
  FinishIngestionRunInput,
  IngestionRefreshPlan,
  IngestionRunRecord,
  MacroObservationIngestionTarget,
  ProviderRawResponseRecord,
  SaveRawResponseInput,
  UpsertMacroObservationPointsInput,
  UpsertMarketDataPointsInput
} from "./types";

type Db = ReturnType<typeof getDb>;

type MarketStatsRow = {
  latestDataDate: string | null;
  provider: string;
  rowCount: number;
};

const defaultMacroTargets: MacroObservationIngestionTarget[] = [
  {
    provider: "fred",
    seriesId: "DGS10",
    unit: "percent"
  },
  {
    provider: "fred",
    seriesId: "VIXCLS",
    unit: "index"
  }
];

export type IngestionRepository = {
  createRun(input: CreateIngestionRunInput): Promise<IngestionRunRecord>;
  finishRun(input: FinishIngestionRunInput): Promise<IngestionRunRecord>;
  getDataStatus(now?: Date): Promise<DataStatusSnapshot>;
  getRefreshPlan(): Promise<IngestionRefreshPlan>;
  saveRawResponse(
    input: SaveRawResponseInput
  ): Promise<ProviderRawResponseRecord>;
  upsertMacroObservationPoints(
    input: UpsertMacroObservationPointsInput
  ): Promise<number>;
  upsertMarketDataPoints(input: UpsertMarketDataPointsInput): Promise<number>;
};

export function createIngestionRepository(db: Db = getDb()): IngestionRepository {
  return {
    async createRun(input) {
      const [run] = await db
        .insert(ingestionRuns)
        .values({
          provider: input.provider,
          requestedBy: input.requestedBy,
          startedAt: input.startedAt,
          status: "running",
          targetKind: input.targetKind,
          targetSymbol: input.targetSymbol
        })
        .returning();

      return requireRow(run, "Ingestion run create returned no row.");
    },

    async finishRun(input) {
      const [run] = await db
        .update(ingestionRuns)
        .set({
          errorMessage: input.errorMessage ?? null,
          finishedAt: input.finishedAt ?? new Date(),
          status: input.status,
          summary: input.summary
        })
        .where(eq(ingestionRuns.id, input.id))
        .returning();

      return requireRow(run, "Ingestion run update returned no row.");
    },

    async getRefreshPlan() {
      const [holdingRows, watchlistRows, keyPriceLevelRows] = await Promise.all([
        db
          .select({
            instrument: instruments
          })
          .from(holdings)
          .innerJoin(instruments, eq(holdings.instrumentId, instruments.id))
          .where(and(eq(holdings.isActive, true), eq(instruments.isActive, true)))
          .orderBy(asc(instruments.symbol)),
        db
          .select({
            instrument: instruments
          })
          .from(watchlistItems)
          .innerJoin(
            instruments,
            eq(watchlistItems.instrumentId, instruments.id)
          )
          .where(
            and(eq(watchlistItems.isActive, true), eq(instruments.isActive, true))
          )
          .orderBy(asc(instruments.symbol)),
        db
          .select({
            instrument: instruments
          })
          .from(keyPriceLevels)
          .innerJoin(instruments, eq(keyPriceLevels.instrumentId, instruments.id))
          .where(
            and(eq(keyPriceLevels.isActive, true), eq(instruments.isActive, true))
          )
          .orderBy(asc(instruments.symbol))
      ]);

      const marketTargetsByInstrumentId = new Map<
        string,
        IngestionRefreshPlan["marketData"][number]
      >();
      const macroTargetsBySeriesId = new Map<string, MacroObservationIngestionTarget>();

      for (const { instrument } of [
        ...holdingRows,
        ...watchlistRows,
        ...keyPriceLevelRows
      ]) {
        const provider = resolveMarketProvider(instrument.assetType);

        if (provider) {
          marketTargetsByInstrumentId.set(instrument.id, {
            assetType: instrument.assetType,
            currency: instrument.currency,
            instrumentId: instrument.id,
            provider,
            providerMetadata: instrument.providerMetadata,
            symbol: normalizeSymbol(instrument.symbol)
          });
        }

        if (instrument.assetType === "macro") {
          const seriesId = normalizeSymbol(instrument.symbol);
          macroTargetsBySeriesId.set(seriesId, {
            provider: "fred",
            seriesId,
            unit: null
          });
        }
      }

      for (const target of defaultMacroTargets) {
        macroTargetsBySeriesId.set(target.seriesId, target);
      }

      return {
        macroObservations: [...macroTargetsBySeriesId.values()].sort((left, right) =>
          left.seriesId.localeCompare(right.seriesId)
        ),
        marketData: [...marketTargetsByInstrumentId.values()].sort((left, right) =>
          left.symbol.localeCompare(right.symbol)
        )
      };
    },

    async getDataStatus(now = new Date()) {
      const [runRows, rawRows, marketStatsRows, macroStatsRows] =
        await Promise.all([
          db
            .select()
            .from(ingestionRuns)
            .orderBy(desc(ingestionRuns.startedAt))
            .limit(100),
          db
            .select()
            .from(providerRawResponses)
            .orderBy(desc(providerRawResponses.fetchedAt))
            .limit(100),
          db
            .select({
              latestDataDate: max(marketDataDaily.date),
              provider: marketDataDaily.provider,
              rowCount: count()
            })
            .from(marketDataDaily)
            .groupBy(marketDataDaily.provider),
          db
            .select({
              latestDataDate: max(macroObservations.date),
              provider: macroObservations.provider,
              rowCount: count()
            })
            .from(macroObservations)
            .groupBy(macroObservations.provider)
        ]);

      const latestRunByProvider = new Map<string, IngestionRunRecord>();
      const latestFetchedAtByProvider = new Map<string, Date>();
      const statsByProvider = new Map<string, MarketStatsRow>();

      for (const run of runRows) {
        if (run.provider !== "manual" && !latestRunByProvider.has(run.provider)) {
          latestRunByProvider.set(run.provider, run);
        }
      }

      for (const rawResponse of rawRows) {
        if (!latestFetchedAtByProvider.has(rawResponse.provider)) {
          latestFetchedAtByProvider.set(rawResponse.provider, rawResponse.fetchedAt);
        }
      }

      for (const row of [...marketStatsRows, ...macroStatsRows]) {
        statsByProvider.set(row.provider, {
          latestDataDate: row.latestDataDate ?? null,
          provider: row.provider,
          rowCount: Number(row.rowCount)
        });
      }

      const batchRun =
        runRows.find(
          (run) => run.provider === "manual" && run.targetKind === "refresh_all"
        ) ?? null;

      return {
        batchRun: batchRun ? toRunSnapshot(batchRun) : null,
        generatedAt: now.toISOString(),
        providers: externalProviderNames.map((provider) => {
          const latestRun = latestRunByProvider.get(provider) ?? null;
          const latestFetchedAt = latestFetchedAtByProvider.get(provider) ?? null;
          const stats = statsByProvider.get(provider);
          const latestDataDate = stats?.latestDataDate ?? null;
          const rowCount = stats?.rowCount ?? 0;

          return {
            errorMessage: latestRun?.errorMessage ?? null,
            latestDataDate,
            latestFetchedAt: latestFetchedAt?.toISOString() ?? null,
            latestRun: latestRun ? toRunSnapshot(latestRun) : null,
            provider,
            rowCount,
            state: resolveProviderState({
              latestDataDate,
              latestRun,
              now,
              rowCount
            })
          };
        })
      };
    },

    async saveRawResponse(input) {
      const [rawResponse] = await db
        .insert(providerRawResponses)
        .values({
          endpoint: input.rawResponse.request.endpoint,
          errorMessage: input.rawResponse.errorMessage,
          fetchedAt: new Date(input.rawResponse.fetchedAt),
          ingestionRunId: input.ingestionRunId,
          payload: input.rawResponse.payload,
          provider: input.rawResponse.request.provider,
          requestKey: input.rawResponse.request.requestKey,
          requestParams: input.rawResponse.request.params,
          responseStatus: input.rawResponse.responseStatus
        })
        .returning();

      return requireRow(rawResponse, "Provider raw response insert returned no row.");
    },

    async upsertMarketDataPoints(input) {
      let written = 0;

      for (const point of input.points) {
        const now = new Date();
        await db
          .insert(marketDataDaily)
          .values({
            adjustedClose: toNumericInsertValue(point.adjustedClose),
            close: String(point.close),
            date: point.date,
            high: toNumericInsertValue(point.high),
            ingestionRunId: input.ingestionRunId,
            instrumentId: input.instrumentId,
            low: toNumericInsertValue(point.low),
            open: toNumericInsertValue(point.open),
            provider: point.sourceProvider,
            rawResponseId: input.rawResponseId,
            updatedAt: now,
            volume: toNumericInsertValue(point.volume)
          })
          .onConflictDoUpdate({
            target: [
              marketDataDaily.instrumentId,
              marketDataDaily.provider,
              marketDataDaily.date
            ],
            set: {
              adjustedClose: toNumericUpdateValue(point.adjustedClose),
              close: String(point.close),
              high: toNumericUpdateValue(point.high),
              ingestionRunId: input.ingestionRunId,
              low: toNumericUpdateValue(point.low),
              open: toNumericUpdateValue(point.open),
              rawResponseId: input.rawResponseId,
              updatedAt: now,
              volume: toNumericUpdateValue(point.volume)
            }
          });
        written += 1;
      }

      return written;
    },

    async upsertMacroObservationPoints(input) {
      let written = 0;

      for (const point of input.points) {
        const now = new Date();
        await db
          .insert(macroObservations)
          .values({
            date: point.date,
            ingestionRunId: input.ingestionRunId,
            provider: point.sourceProvider,
            rawResponseId: input.rawResponseId,
            seriesId: point.seriesId,
            unit: point.unit ?? undefined,
            updatedAt: now,
            value: String(point.value)
          })
          .onConflictDoUpdate({
            target: [
              macroObservations.seriesId,
              macroObservations.provider,
              macroObservations.date
            ],
            set: {
              ingestionRunId: input.ingestionRunId,
              rawResponseId: input.rawResponseId,
              unit: point.unit ?? sql`null`,
              updatedAt: now,
              value: String(point.value)
            }
          });
        written += 1;
      }

      return written;
    }
  };
}

function resolveMarketProvider(assetType: string) {
  if (assetType === "crypto") {
    return "coingecko" as const;
  }

  if (assetType === "stock" || assetType === "etf" || assetType === "index") {
    return "fmp" as const;
  }

  return null;
}

function resolveProviderState(input: {
  latestDataDate: string | null;
  latestRun: IngestionRunRecord | null;
  now: Date;
  rowCount: number;
}): DataProviderState {
  if (!input.latestRun) {
    return "idle";
  }

  if (input.latestRun.status === "pending" || input.latestRun.status === "running") {
    return "running";
  }

  if (input.latestRun.status === "failed") {
    return "error";
  }

  if (input.rowCount === 0) {
    return "empty";
  }

  if (!input.latestDataDate || isDataStale(input.latestDataDate, input.now)) {
    return "stale";
  }

  return "ok";
}

function isDataStale(date: string, now: Date) {
  const dataTime = new Date(`${date}T00:00:00.000Z`);
  const staleAfterMs = 7 * 24 * 60 * 60 * 1000;

  return now.getTime() - dataTime.getTime() > staleAfterMs;
}

function toRunSnapshot(run: IngestionRunRecord) {
  return {
    errorMessage: run.errorMessage,
    finishedAt: run.finishedAt,
    id: run.id,
    startedAt: run.startedAt,
    status: run.status,
    summary: run.summary,
    targetKind: run.targetKind,
    targetSymbol: run.targetSymbol
  };
}

function toNumericInsertValue(value: number | null) {
  return value === null ? undefined : String(value);
}

function toNumericUpdateValue(value: number | null) {
  return value === null ? sql`null` : String(value);
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }

  return row;
}
