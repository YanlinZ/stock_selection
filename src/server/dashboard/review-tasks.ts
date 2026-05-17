import type {
  DashboardDecisionSnapshotScope,
  DashboardHistoryEntry,
  DashboardHistoryOutcomeWindow,
  DashboardPlanStatusKind,
  DashboardReviewTaskEvidenceCounts,
  DashboardReviewTaskSnapshot
} from "./types";

const reviewTaskLimit = 12;

const statusRank: Record<DashboardReviewTaskSnapshot["status"], number> = {
  ready: 0,
  pending: 1,
  insufficient_data: 2
};

const scopeRank: Record<DashboardDecisionSnapshotScope, number> = {
  opportunity: 0,
  holding: 1,
  summary: 2
};

const windowRank: Record<DashboardReviewTaskSnapshot["tradingDays"], number> = {
  1: 0,
  5: 1,
  20: 2
};

export function createDashboardReviewTasks(
  entries: DashboardHistoryEntry[],
  { limit = reviewTaskLimit }: { limit?: number } = {}
): DashboardReviewTaskSnapshot[] {
  return entries
    .flatMap((entry) =>
      entry.outcomes.map((outcome) => createReviewTask(entry, outcome))
    )
    .toSorted(compareReviewTasks)
    .slice(0, limit)
    .map((task, index) => ({
      ...task,
      priority: index + 1
    }));
}

function createReviewTask(
  entry: DashboardHistoryEntry,
  outcome: DashboardHistoryOutcomeWindow
): DashboardReviewTaskSnapshot {
  return {
    actionKind: entry.actionKind,
    actionLabel: entry.actionLabel,
    basisDate: entry.basisDate,
    confidence: entry.confidence,
    dataQuality: entry.dataQuality,
    entryClose: outcome.entryClose,
    entryDate: outcome.entryDate,
    evidenceCounts: countEvidence(entry),
    id: [
      entry.snapshotDate,
      entry.scope,
      entry.subjectKey,
      entry.ruleVersion,
      outcome.tradingDays
    ].join(":"),
    instrumentId: entry.instrumentId,
    message: createTaskMessage(outcome),
    outcomeClose: outcome.outcomeClose,
    outcomeDate: outcome.outcomeDate,
    planStatus: entry.planStatus,
    priority: 0,
    returnPercent: outcome.returnPercent,
    ruleVersion: entry.ruleVersion,
    scope: entry.scope,
    snapshotDate: entry.snapshotDate,
    status: outcome.status,
    subjectKey: entry.subjectKey,
    symbol: entry.symbol,
    tradingDays: outcome.tradingDays
  };
}

function createTaskMessage(outcome: DashboardHistoryOutcomeWindow) {
  if (outcome.status === "ready") {
    return `已到 ${outcome.tradingDays}D 观察窗口，可人工复盘。`;
  }

  if (outcome.status === "pending") {
    return `等待 ${outcome.tradingDays} 个交易日后的 normalized price，再进行人工复盘。`;
  }

  return `数据不足：${outcome.message}`;
}

function countEvidence(entry: DashboardHistoryEntry): DashboardReviewTaskEvidenceCounts {
  return {
    missing: entry.evidence.missing.length,
    opposing: entry.evidence.opposing.length,
    risks: entry.evidence.risks.length,
    supporting: entry.evidence.supporting.length
  };
}

function compareReviewTasks(
  left: DashboardReviewTaskSnapshot,
  right: DashboardReviewTaskSnapshot
) {
  return (
    statusRank[left.status] - statusRank[right.status] ||
    planEventRank(left.status, left.planStatus.status) -
      planEventRank(right.status, right.planStatus.status) ||
    scopeRank[left.scope] - scopeRank[right.scope] ||
    windowRank[left.tradingDays] - windowRank[right.tradingDays] ||
    right.snapshotDate.localeCompare(left.snapshotDate) ||
    (left.symbol ?? left.subjectKey).localeCompare(right.symbol ?? right.subjectKey)
  );
}

function planEventRank(
  taskStatus: DashboardReviewTaskSnapshot["status"],
  planStatus: DashboardPlanStatusKind
) {
  if (
    taskStatus === "ready" &&
    (planStatus === "triggered" || planStatus === "invalidated")
  ) {
    return 0;
  }

  return 1;
}
