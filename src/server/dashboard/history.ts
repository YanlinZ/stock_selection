import { calculateDashboardHistoryOutcomes } from "./history-outcomes";
import { calculateHistoricalPlanStatus } from "./plan-status";
import { createDashboardReviewTasks } from "./review-tasks";
import type {
  DashboardDecisionSnapshotRecord,
  DashboardHistoryInputSnapshot,
  DashboardHistorySnapshot,
  DashboardMarketDataPoint
} from "./types";

export function createDashboardHistorySnapshot(
  input: DashboardHistoryInputSnapshot,
  {
    asOfDate,
    generatedAt
  }: {
    asOfDate: string;
    generatedAt: Date;
  }
): DashboardHistorySnapshot {
  const marketDataByInstrumentId = groupMarketDataByInstrumentId(input.marketData);
  const entries = input.decisionSnapshots
    .toSorted(compareDecisionSnapshots)
    .map((record) => {
      const marketData = record.instrumentId
        ? (marketDataByInstrumentId.get(record.instrumentId) ?? [])
        : [];

      return {
        actionKind: record.actionKind,
        actionLabel: record.actionLabel,
        basisDate: record.basisDate,
        confidence: record.confidence,
        dataQuality: record.dataQuality,
        dataSources: record.dataSources,
        evidence: record.evidence,
        generatedAt: record.generatedAt.toISOString(),
        instrumentId: record.instrumentId,
        outcomes: calculateDashboardHistoryOutcomes({
          asOfDate,
          marketData,
          snapshot: record
        }),
        planStatus: calculateHistoricalPlanStatus({
          actionKind: record.actionKind,
          asOfDate,
          basisDate: record.basisDate,
          instrumentId: record.instrumentId,
          keyLevels: record.keyLevels,
          marketData
        }),
        ruleVersion: record.ruleVersion,
        scope: record.scope,
        snapshotDate: record.snapshotDate,
        subjectKey: record.subjectKey,
        symbol: record.symbol
      };
    });

  return {
    entries,
    generatedAt: generatedAt.toISOString(),
    reviewTasks: createDashboardReviewTasks(entries),
    status: entries.length > 0 ? "ready" : "empty"
  };
}

function groupMarketDataByInstrumentId(marketData: DashboardMarketDataPoint[]) {
  const grouped = new Map<string, DashboardMarketDataPoint[]>();

  for (const point of marketData) {
    const points = grouped.get(point.instrumentId);

    if (points) {
      points.push(point);
    } else {
      grouped.set(point.instrumentId, [point]);
    }
  }

  return grouped;
}

function compareDecisionSnapshots(
  left: DashboardDecisionSnapshotRecord,
  right: DashboardDecisionSnapshotRecord
) {
  const dateComparison = right.snapshotDate.localeCompare(left.snapshotDate);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  const generatedAtComparison =
    right.generatedAt.getTime() - left.generatedAt.getTime();

  if (generatedAtComparison !== 0) {
    return generatedAtComparison;
  }

  const scopeComparison = left.scope.localeCompare(right.scope);

  if (scopeComparison !== 0) {
    return scopeComparison;
  }

  return (left.symbol ?? "").localeCompare(right.symbol ?? "");
}
