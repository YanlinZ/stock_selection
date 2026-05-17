import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  dashboardDecisionSnapshots,
  holdings,
  ingestionRuns,
  instruments,
  keyPriceLevels,
  macroObservations,
  marketDataDaily,
  watchlistItems
} from "@/db/schema";

import type {
  DashboardDecisionSnapshotRecord,
  DashboardHistoryInputSnapshot,
  DashboardHistoryQueryOptions,
  DashboardInputSnapshot,
  DashboardInstrument,
  DashboardMarketDataPoint,
  DashboardMacroObservation,
  DashboardRunSnapshot
} from "./types";

type Db = ReturnType<typeof getDb>;

const macroSeriesIds = ["DGS10", "VIXCLS"];

export type DashboardRepository = {
  getDashboardInputs(): Promise<DashboardInputSnapshot>;
  getDashboardHistoryInputs?(
    options?: DashboardHistoryQueryOptions
  ): Promise<DashboardHistoryInputSnapshot>;
  persistDailyDecisionSnapshots?(
    snapshots: DashboardDecisionSnapshotRecord[]
  ): Promise<void>;
};

export function createDashboardRepository(db: Db = getDb()): DashboardRepository {
  return {
    async getDashboardInputs() {
      const [holdingRows, watchlistRows, keyPriceLevelRows, latestBatchRunRows] =
        await Promise.all([
          db
            .select({
              holding: holdings,
              instrument: instruments
            })
            .from(holdings)
            .innerJoin(instruments, eq(holdings.instrumentId, instruments.id))
            .where(and(eq(holdings.isActive, true), eq(instruments.isActive, true)))
            .orderBy(asc(instruments.symbol)),
          db
            .select({
              instrument: instruments,
              watchlistItem: watchlistItems
            })
            .from(watchlistItems)
            .innerJoin(
              instruments,
              eq(watchlistItems.instrumentId, instruments.id)
            )
            .where(
              and(eq(watchlistItems.isActive, true), eq(instruments.isActive, true))
            )
            .orderBy(asc(watchlistItems.priority), asc(instruments.symbol)),
          db
            .select({
              instrument: instruments,
              keyPriceLevel: keyPriceLevels
            })
            .from(keyPriceLevels)
            .innerJoin(instruments, eq(keyPriceLevels.instrumentId, instruments.id))
            .where(
              and(eq(keyPriceLevels.isActive, true), eq(instruments.isActive, true))
            )
            .orderBy(asc(instruments.symbol), asc(keyPriceLevels.levelType)),
          db
            .select()
            .from(ingestionRuns)
            .where(
              and(
                eq(ingestionRuns.provider, "manual"),
                eq(ingestionRuns.targetKind, "refresh_all")
              )
            )
            .orderBy(desc(ingestionRuns.startedAt))
            .limit(1)
        ]);

      const activeInstrumentIds = [
        ...new Set(
          [...holdingRows, ...watchlistRows, ...keyPriceLevelRows].map(
            ({ instrument }) => instrument.id
          )
        )
      ];

      const [marketRows, macroRows] = await Promise.all([
        activeInstrumentIds.length > 0
          ? db
              .select()
              .from(marketDataDaily)
              .where(inArray(marketDataDaily.instrumentId, activeInstrumentIds))
              .orderBy(asc(marketDataDaily.instrumentId), asc(marketDataDaily.date))
          : Promise.resolve([]),
        db
          .select()
          .from(macroObservations)
          .where(inArray(macroObservations.seriesId, macroSeriesIds))
          .orderBy(asc(macroObservations.seriesId), asc(macroObservations.date))
      ]);

      return {
        holdings: holdingRows.map(({ holding, instrument }) => ({
          costBasis: toNullableNumber(holding.costBasis),
          holdingType: holding.holdingType,
          id: holding.id,
          instrument: toDashboardInstrument(instrument),
          notes: holding.notes,
          positionSize: holding.positionSize,
          updatedAt: holding.updatedAt
        })),
        keyPriceLevels: keyPriceLevelRows.map(({ keyPriceLevel, instrument }) => ({
          currency: keyPriceLevel.currency,
          id: keyPriceLevel.id,
          instrument: toDashboardInstrument(instrument),
          levelType: keyPriceLevel.levelType,
          notes: keyPriceLevel.notes,
          price: toNumber(keyPriceLevel.price),
          updatedAt: keyPriceLevel.updatedAt
        })),
        latestBatchRun: latestBatchRunRows[0]
          ? toDashboardRunSnapshot(latestBatchRunRows[0])
          : null,
        macroObservations: macroRows.map(
          (row): DashboardMacroObservation => ({
            date: row.date,
            ingestionRunId: row.ingestionRunId,
            provider: row.provider,
            seriesId: row.seriesId,
            unit: row.unit,
            updatedAt: row.updatedAt,
            value: toNumber(row.value)
          })
        ),
        marketData: marketRows.map(
          (row): DashboardMarketDataPoint => ({
            adjustedClose: toNullableNumber(row.adjustedClose),
            close: toNumber(row.close),
            date: row.date,
            high: toNullableNumber(row.high),
            ingestionRunId: row.ingestionRunId,
            instrumentId: row.instrumentId,
            low: toNullableNumber(row.low),
            open: toNullableNumber(row.open),
            provider: row.provider,
            updatedAt: row.updatedAt,
            volume: toNullableNumber(row.volume)
          })
        ),
        watchlistItems: watchlistRows.map(({ instrument, watchlistItem }) => ({
          id: watchlistItem.id,
          instrument: toDashboardInstrument(instrument),
          notes: watchlistItem.notes,
          priority: watchlistItem.priority,
          theme: watchlistItem.theme,
          updatedAt: watchlistItem.updatedAt
        }))
      };
    },

    async getDashboardHistoryInputs({ limit = 50, sinceDate } = {}) {
      const snapshotRows = sinceDate
        ? await db
            .select()
            .from(dashboardDecisionSnapshots)
            .where(gte(dashboardDecisionSnapshots.snapshotDate, sinceDate))
            .orderBy(
              desc(dashboardDecisionSnapshots.snapshotDate),
              desc(dashboardDecisionSnapshots.generatedAt),
              asc(dashboardDecisionSnapshots.scope),
              asc(dashboardDecisionSnapshots.symbol)
            )
            .limit(limit)
        : await db
            .select()
            .from(dashboardDecisionSnapshots)
            .orderBy(
              desc(dashboardDecisionSnapshots.snapshotDate),
              desc(dashboardDecisionSnapshots.generatedAt),
              asc(dashboardDecisionSnapshots.scope),
              asc(dashboardDecisionSnapshots.symbol)
            )
            .limit(limit);
      const decisionSnapshots = snapshotRows.map(toDecisionSnapshotRecord);
      const instrumentIds = [
        ...new Set(
          decisionSnapshots
            .map((snapshot) => snapshot.instrumentId)
            .filter((instrumentId): instrumentId is string => instrumentId !== null)
        )
      ];
      const marketRows =
        instrumentIds.length > 0
          ? await db
              .select()
              .from(marketDataDaily)
              .where(inArray(marketDataDaily.instrumentId, instrumentIds))
              .orderBy(asc(marketDataDaily.instrumentId), asc(marketDataDaily.date))
          : [];

      return {
        decisionSnapshots,
        marketData: marketRows.map(toDashboardMarketDataPoint)
      };
    },

    async persistDailyDecisionSnapshots(snapshots) {
      const now = new Date();

      for (const snapshot of snapshots) {
        await db
          .insert(dashboardDecisionSnapshots)
          .values({
            actionKind: snapshot.actionKind,
            actionLabel: snapshot.actionLabel,
            basisDate: snapshot.basisDate,
            confidence: snapshot.confidence,
            dataQuality: snapshot.dataQuality,
            dataSources: snapshot.dataSources,
            evidence: snapshot.evidence,
            generatedAt: snapshot.generatedAt,
            instrumentId: snapshot.instrumentId,
            keyLevels: snapshot.keyLevels,
            macroState: snapshot.macroState,
            ruleVersion: snapshot.ruleVersion,
            scope: snapshot.scope,
            snapshotDate: snapshot.snapshotDate,
            subjectKey: snapshot.subjectKey,
            symbol: snapshot.symbol,
            updatedAt: now
          })
          .onConflictDoUpdate({
            target: [
              dashboardDecisionSnapshots.snapshotDate,
              dashboardDecisionSnapshots.scope,
              dashboardDecisionSnapshots.subjectKey,
              dashboardDecisionSnapshots.ruleVersion
            ],
            set: {
              actionKind: snapshot.actionKind,
              actionLabel: snapshot.actionLabel,
              basisDate: snapshot.basisDate,
              confidence: snapshot.confidence,
              dataQuality: snapshot.dataQuality,
              dataSources: snapshot.dataSources,
              evidence: snapshot.evidence,
              generatedAt: snapshot.generatedAt,
              instrumentId: snapshot.instrumentId,
              keyLevels: snapshot.keyLevels,
              macroState: snapshot.macroState,
              symbol: snapshot.symbol,
              updatedAt: now
            }
          });
      }
    }
  };
}

function toDecisionSnapshotRecord(
  row: typeof dashboardDecisionSnapshots.$inferSelect
): DashboardDecisionSnapshotRecord {
  return {
    actionKind: row.actionKind as DashboardDecisionSnapshotRecord["actionKind"],
    actionLabel: row.actionLabel,
    basisDate: row.basisDate,
    confidence: row.confidence as DashboardDecisionSnapshotRecord["confidence"],
    dataQuality: row.dataQuality as DashboardDecisionSnapshotRecord["dataQuality"],
    dataSources:
      row.dataSources as DashboardDecisionSnapshotRecord["dataSources"],
    evidence: row.evidence as DashboardDecisionSnapshotRecord["evidence"],
    generatedAt: row.generatedAt,
    instrumentId: row.instrumentId,
    keyLevels: row.keyLevels as DashboardDecisionSnapshotRecord["keyLevels"],
    macroState: row.macroState,
    ruleVersion: row.ruleVersion,
    scope: row.scope as DashboardDecisionSnapshotRecord["scope"],
    snapshotDate: row.snapshotDate,
    subjectKey: row.subjectKey,
    symbol: row.symbol
  };
}

function toDashboardMarketDataPoint(
  row: typeof marketDataDaily.$inferSelect
): DashboardMarketDataPoint {
  return {
    adjustedClose: toNullableNumber(row.adjustedClose),
    close: toNumber(row.close),
    date: row.date,
    high: toNullableNumber(row.high),
    ingestionRunId: row.ingestionRunId,
    instrumentId: row.instrumentId,
    low: toNullableNumber(row.low),
    open: toNullableNumber(row.open),
    provider: row.provider,
    updatedAt: row.updatedAt,
    volume: toNullableNumber(row.volume)
  };
}

function toDashboardInstrument(instrument: typeof instruments.$inferSelect): DashboardInstrument {
  return {
    assetType: instrument.assetType,
    currency: instrument.currency,
    exchange: instrument.exchange,
    id: instrument.id,
    name: instrument.name,
    symbol: instrument.symbol
  };
}

function toDashboardRunSnapshot(
  run: typeof ingestionRuns.$inferSelect
): DashboardRunSnapshot {
  return {
    errorMessage: run.errorMessage,
    finishedAt: run.finishedAt,
    id: run.id,
    startedAt: run.startedAt,
    status: run.status,
    summary: run.summary,
    targetKind: run.targetKind as DashboardRunSnapshot["targetKind"],
    targetSymbol: run.targetSymbol
  };
}

function toNullableNumber(value: string | null) {
  return value === null ? null : toNumber(value);
}

function toNumber(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error("Expected numeric database value.");
  }

  return parsed;
}
