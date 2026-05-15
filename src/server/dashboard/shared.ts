import { roundPercent } from "./indicators";
import type {
  DashboardActionRecommendation,
  DashboardDataQuality,
  DashboardDataSourceSnapshot,
  DashboardEvidenceGroups,
  DashboardEvidenceItem,
  DashboardKeyPriceLevelInput,
  DashboardTrustActionRecommendation
} from "./types";

export const dashboardRuleVersion = "dashboard-rules-v4.0.0";

const staleAfterDays = 7;

export function createEmptyEvidence(): DashboardEvidenceGroups {
  return {
    missing: [],
    opposing: [],
    risks: [],
    supporting: []
  };
}

export function createEvidenceItem(
  input: DashboardEvidenceItem
): DashboardEvidenceItem {
  return input;
}

export function createTrustAction({
  basisDate,
  dataQuality,
  dataSources,
  evidence,
  kind,
  label,
  reasonFallback,
  riskFallback
}: {
  basisDate: string | null;
  dataQuality: DashboardDataQuality;
  dataSources: DashboardDataSourceSnapshot[];
  evidence: DashboardEvidenceGroups;
  kind: DashboardActionRecommendation["kind"];
  label: string;
  reasonFallback?: string;
  riskFallback: string;
}): DashboardTrustActionRecommendation {
  const supporting =
    evidence.supporting.length > 0
      ? evidence.supporting
      : reasonFallback
        ? [
            createEvidenceItem({
              basisDate,
              detail: null,
              impact: "neutral",
              label: reasonFallback,
              source: "market_data_daily"
            })
          ]
        : [];
  const risks =
    evidence.risks.length > 0
      ? evidence.risks
      : [
          createEvidenceItem({
            basisDate,
            detail: null,
            impact: "negative",
            label: riskFallback,
            source: "market_data_daily"
          })
        ];
  const normalizedEvidence = {
    ...evidence,
    risks,
    supporting
  };

  return {
    basisDate,
    confidence: resolveConfidence({
      dataQuality,
      evidence: normalizedEvidence,
      kind
    }),
    dataQuality,
    dataSources,
    evidence: normalizedEvidence,
    kind,
    label,
    reasons: supporting.map((item) => item.label),
    risks: risks.map((item) => item.label),
    ruleVersion: dashboardRuleVersion
  };
}

function resolveConfidence({
  dataQuality,
  evidence,
  kind
}: {
  dataQuality: DashboardDataQuality;
  evidence: DashboardEvidenceGroups;
  kind: DashboardActionRecommendation["kind"];
}) {
  if (dataQuality === "stale" || dataQuality === "unavailable") {
    return "low" as const;
  }

  if (dataQuality === "partial") {
    return evidence.missing.length >= 2 ? ("low" as const) : ("medium" as const);
  }

  if (kind === "risk_control") {
    return "high" as const;
  }

  if (evidence.supporting.length >= 2 && evidence.opposing.length === 0) {
    return "high" as const;
  }

  return evidence.supporting.length > 0 ? ("medium" as const) : ("low" as const);
}

export function isDateStale(date: string, nowIso: string) {
  const dataTime = new Date(`${date}T00:00:00.000Z`);
  const now = new Date(nowIso);
  const staleAfterMs = staleAfterDays * 24 * 60 * 60 * 1000;

  return now.getTime() - dataTime.getTime() > staleAfterMs;
}

export function maxDate(dates: string[]) {
  return dates.sort().at(-1) ?? null;
}

export function maxIso(dates: Array<Date | null>) {
  return (
    dates
      .filter((date): date is Date => date instanceof Date)
      .map((date) => date.toISOString())
      .sort()
      .at(-1) ?? null
  );
}

export function formatLevelType(
  levelType: DashboardKeyPriceLevelInput["levelType"]
) {
  const labels: Record<DashboardKeyPriceLevelInput["levelType"], string> = {
    long_term_add: "长期加仓价",
    resistance: "压力位",
    risk: "风险位",
    support: "支撑位",
    watch: "观察价"
  };

  return labels[levelType];
}

export function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${roundPercent(value).toFixed(1)}%`;
}
