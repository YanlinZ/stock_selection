import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  holdings,
  ingestionRuns,
  instruments,
  keyPriceLevels,
  macroObservations,
  marketDataDaily,
  watchlistItems
} from "@/db/schema";

import type {
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
          positionSize: holding.positionSize
        })),
        keyPriceLevels: keyPriceLevelRows.map(({ keyPriceLevel, instrument }) => ({
          currency: keyPriceLevel.currency,
          id: keyPriceLevel.id,
          instrument: toDashboardInstrument(instrument),
          levelType: keyPriceLevel.levelType,
          notes: keyPriceLevel.notes,
          price: toNumber(keyPriceLevel.price)
        })),
        latestBatchRun: latestBatchRunRows[0]
          ? toDashboardRunSnapshot(latestBatchRunRows[0])
          : null,
        macroObservations: macroRows.map(
          (row): DashboardMacroObservation => ({
            date: row.date,
            provider: row.provider,
            seriesId: row.seriesId,
            unit: row.unit,
            value: toNumber(row.value)
          })
        ),
        marketData: marketRows.map(
          (row): DashboardMarketDataPoint => ({
            adjustedClose: toNullableNumber(row.adjustedClose),
            close: toNumber(row.close),
            date: row.date,
            high: toNullableNumber(row.high),
            instrumentId: row.instrumentId,
            low: toNullableNumber(row.low),
            open: toNullableNumber(row.open),
            provider: row.provider,
            volume: toNullableNumber(row.volume)
          })
        ),
        watchlistItems: watchlistRows.map(({ instrument, watchlistItem }) => ({
          id: watchlistItem.id,
          instrument: toDashboardInstrument(instrument),
          notes: watchlistItem.notes,
          priority: watchlistItem.priority,
          theme: watchlistItem.theme
        }))
      };
    }
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
