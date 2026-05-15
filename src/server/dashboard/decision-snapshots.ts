import { createSummaryDataSources } from "./data-sources";
import { createEvidenceItem, dashboardRuleVersion } from "./shared";
import type {
  DashboardActionRecommendation,
  DashboardDataQuality,
  DashboardDecisionSnapshotRecord,
  DashboardEvidenceGroups,
  DashboardSnapshot,
  DashboardStatus,
  KeyLevelProximitySnapshot
} from "./types";

export function createDailyDecisionSnapshotRecords(
  snapshot: DashboardSnapshot
): DashboardDecisionSnapshotRecord[] {
  const generatedAt = new Date(snapshot.generatedAt);
  const snapshotDate = snapshot.generatedAt.slice(0, 10);
  const macroState = createSafeMacroState(snapshot.macro);

  return [
    {
      actionKind: snapshot.summary.kind,
      actionLabel: snapshot.summary.label,
      basisDate: snapshot.summary.basisDate,
      confidence: snapshot.status === "ready" ? "medium" : "low",
      dataQuality: mapDashboardStatusToDataQuality(snapshot.status),
      dataSources: createSummaryDataSources(snapshot),
      evidence: createFallbackEvidence(snapshot.summary),
      generatedAt,
      instrumentId: null,
      keyLevels: snapshot.keyLevelAlerts.slice(0, 10).map(toSafeKeyLevelSnapshot),
      macroState,
      ruleVersion: dashboardRuleVersion,
      scope: "summary",
      snapshotDate,
      subjectKey: "summary",
      symbol: null
    },
    ...snapshot.holdings.map(
      (target): DashboardDecisionSnapshotRecord => ({
        actionKind: target.action.kind,
        actionLabel: target.action.label,
        basisDate: target.action.basisDate,
        confidence: target.action.confidence,
        dataQuality: target.action.dataQuality,
        dataSources: target.action.dataSources,
        evidence: target.action.evidence,
        generatedAt,
        instrumentId: target.instrument.id,
        keyLevels: target.keyLevels.slice(0, 10).map(toSafeKeyLevelSnapshot),
        macroState,
        ruleVersion: target.action.ruleVersion,
        scope: "holding",
        snapshotDate,
        subjectKey: target.instrument.id,
        symbol: target.instrument.symbol
      })
    )
  ];
}

function createFallbackEvidence(
  action: DashboardActionRecommendation
): DashboardEvidenceGroups {
  return {
    missing: [],
    opposing: [],
    risks: action.risks.map((risk) =>
      createEvidenceItem({
        basisDate: action.basisDate,
        detail: null,
        impact: "negative",
        label: risk,
        source: "market_data_daily"
      })
    ),
    supporting: action.reasons.map((reason) =>
      createEvidenceItem({
        basisDate: action.basisDate,
        detail: null,
        impact: "neutral",
        label: reason,
        source: "market_data_daily"
      })
    )
  };
}

function mapDashboardStatusToDataQuality(
  status: DashboardStatus
): DashboardDataQuality {
  const qualities: Record<DashboardStatus, DashboardDataQuality> = {
    ready: "partial",
    stale: "stale",
    unavailable: "unavailable"
  };

  return qualities[status];
}

function createSafeMacroState(
  macro: DashboardSnapshot["macro"]
): Record<string, unknown> {
  return {
    basisDate: macro.basisDate,
    marketRiskScore: macro.marketRiskScore,
    observations: macro.observations.map((observation) => ({
      date: observation.date,
      label: observation.label,
      seriesId: observation.seriesId,
      unit: observation.unit,
      value: observation.value
    })),
    panicReboundState: macro.panicReboundMode.state,
    reboundOpportunityScore: macro.reboundOpportunityScore,
    status: macro.status
  };
}

function toSafeKeyLevelSnapshot(
  proximity: KeyLevelProximitySnapshot
): Record<string, unknown> {
  return {
    currency: proximity.level.currency,
    distancePercent: proximity.distancePercent,
    levelType: proximity.level.levelType,
    price: proximity.level.price,
    state: proximity.state,
    thresholdPercent: proximity.thresholdPercent
  };
}
