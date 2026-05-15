import { createOpportunityDataSources } from "./data-sources";
import {
  createEmptyEvidence,
  createEvidenceItem,
  createTrustAction,
  dashboardRuleVersion,
  formatLevelType,
  formatSignedPercent
} from "./shared";
import type {
  DashboardDataFreshness,
  DashboardDataQuality,
  DashboardDataSourceSnapshot,
  DashboardEvidenceGroups,
  DashboardOpportunityEvaluation,
  DashboardOpportunitySummary,
  DashboardSnapshot,
  DashboardStatus,
  DashboardTargetSnapshot,
  DashboardTrustActionRecommendation,
  KeyLevelProximitySnapshot
} from "./types";

const opportunityScoreThreshold = 65;

type InternalOpportunityEvaluation = DashboardOpportunityEvaluation & {
  target: DashboardTargetSnapshot;
};

export function createOpportunitySummary({
  dataFreshness,
  macro,
  status,
  targets
}: {
  dataFreshness: DashboardDataFreshness;
  macro: DashboardSnapshot["macro"];
  status: DashboardStatus;
  targets: DashboardTargetSnapshot[];
}): DashboardOpportunitySummary {
  const dataSources = createOpportunityDataSources({
    dataFreshness,
    status
  });

  if (targets.length === 0) {
    return createEmptyOpportunitySummary({
      basisDate: null,
      dataQuality: "unavailable",
      dataSources,
      evaluatedTargetCount: 0,
      evaluations: [],
      reason: "尚未配置 active holdings 或 watchlist_items"
    });
  }

  if (status !== "ready") {
    return createEmptyOpportunitySummary({
      basisDate: dataFreshness.latestMarketDate ?? macro.basisDate,
      dataQuality: status === "stale" ? "stale" : "unavailable",
      dataSources,
      evaluatedTargetCount: targets.length,
      evaluations: targets.map((target) =>
        createUnavailableOpportunityEvaluation({
          reason:
            status === "stale"
              ? "价格或宏观数据已过期，今日不输出机会"
              : "最低价格数据不足，今日不输出机会",
          target
        })
      ),
      reason:
        status === "stale"
          ? "数据已过期，今日不输出机会"
          : "数据不足，今日不输出机会"
    });
  }

  const evaluations = targets.map((target) =>
    evaluateOpportunityCandidate({ macro, target })
  );
  const rankedCandidates = evaluations
    .filter(
      (
        evaluation
      ): evaluation is InternalOpportunityEvaluation & {
        opportunityScore: number;
      } =>
        evaluation.opportunityScore !== null &&
        evaluation.disqualifiedReasons.length === 0
    )
    .sort(compareOpportunityEvaluations)
    .map((evaluation, index) => ({
      ...evaluation,
      opportunityRank: index + 1
    }));
  const rankedByInstrumentId = new Map(
    rankedCandidates.map((evaluation) => [evaluation.instrumentId, evaluation])
  );
  const evaluatedTargets = evaluations.map(
    (evaluation) => rankedByInstrumentId.get(evaluation.instrumentId) ?? evaluation
  );
  const best = rankedCandidates[0] ?? null;

  if (!best) {
    const disqualifiedReasons =
      createOpportunitySummaryDisqualifiedReasons(evaluatedTargets);

    return createEmptyOpportunitySummary({
      basisDate: dataFreshness.latestMarketDate ?? macro.basisDate,
      dataQuality: resolveOpportunitySummaryDataQuality(targets),
      dataSources,
      disqualifiedReasons,
      evaluatedTargetCount: targets.length,
      evaluations: evaluatedTargets.map(toPublicOpportunityEvaluation),
      reason:
        disqualifiedReasons[0] ??
        "没有标的同时满足关键价位、数据质量和宏观过滤"
    });
  }

  return {
    action: createOpportunityAction(best),
    candidate: best.target,
    disqualifiedReasons: [],
    evaluatedTargetCount: targets.length,
    evaluations: evaluatedTargets.map(toPublicOpportunityEvaluation),
    score: best.opportunityScore,
    status: "available"
  };
}

export function createEmptyOpportunitySummary({
  basisDate,
  dataQuality,
  dataSources,
  disqualifiedReasons,
  evaluatedTargetCount,
  evaluations,
  reason
}: {
  basisDate: string | null;
  dataQuality: DashboardDataQuality;
  dataSources: DashboardDataSourceSnapshot[];
  disqualifiedReasons?: string[];
  evaluatedTargetCount: number;
  evaluations: DashboardOpportunityEvaluation[];
  reason: string;
}): DashboardOpportunitySummary {
  const normalizedDisqualifiedReasons = disqualifiedReasons ?? [reason];
  const evidence = createEmptyOpportunityEvidence({
    basisDate,
    dataQuality,
    reason
  });

  return {
    action: createTrustAction({
      basisDate,
      dataQuality,
      dataSources,
      evidence,
      kind: dataQuality === "unavailable" ? "refresh_data" : "wait",
      label: "今日无高质量关注机会，保持观察。",
      riskFallback: "为满足交易冲动而展示次优机会，会降低信噪比"
    }),
    candidate: null,
    disqualifiedReasons: normalizedDisqualifiedReasons,
    evaluatedTargetCount,
    evaluations,
    score: null,
    status: "none"
  };
}

function evaluateOpportunityCandidate({
  macro,
  target
}: {
  macro: DashboardSnapshot["macro"];
  target: DashboardTargetSnapshot;
}): InternalOpportunityEvaluation {
  const disqualifiedReasons: string[] = [];
  const opportunityReasons: string[] = [];
  const nearestActionableLevel = target.keyLevels.find(
    (level) =>
      level.isNear &&
      ["long_term_add", "support", "watch"].includes(level.level.levelType)
  );

  if (target.action.dataQuality !== "complete") {
    const reasonByQuality: Record<DashboardDataQuality, string> = {
      complete: "",
      partial: "关键输入仍有缺口，不能升级为今日机会",
      stale: "价格或宏观数据已过期，不能升级为今日机会",
      unavailable: "缺少最低价格数据，不能升级为今日机会"
    };
    disqualifiedReasons.push(reasonByQuality[target.action.dataQuality]);
  }

  if (
    target.action.kind !== "consider_small_add" &&
    target.action.kind !== "watch_key_level"
  ) {
    disqualifiedReasons.push(
      `当前行动为「${target.action.label}」，不是规则化机会 action`
    );
  } else {
    opportunityReasons.push(target.action.label);
  }

  if (
    macro.status === "elevated" &&
    macro.panicReboundMode.state !== "active" &&
    macro.panicReboundMode.state !== "watch"
  ) {
    disqualifiedReasons.push("宏观风险偏高且反弹机会未开启");
  }

  if (nearestActionableLevel) {
    opportunityReasons.push(
      `${target.instrument.symbol} 距 ${formatLevelType(
        nearestActionableLevel.level.levelType
      )} ${nearestActionableLevel.level.price} 为 ${nearestActionableLevel.distanceText}`
    );
  } else {
    disqualifiedReasons.push("未接近 support / buy zone / watch 关键价位");
  }

  if (target.changePercent !== null && target.changePercent <= -3) {
    opportunityReasons.push(`日跌幅 ${formatSignedPercent(target.changePercent)}`);
  }

  if (
    macro.panicReboundMode.state === "active" ||
    macro.panicReboundMode.state === "watch"
  ) {
    opportunityReasons.push(macro.panicReboundMode.label);
  }

  const opportunityScore =
    nearestActionableLevel && disqualifiedReasons.length === 0
      ? scoreOpportunityCandidate({
          macro,
          nearestActionableLevel,
          target
        })
      : null;

  if (
    opportunityScore !== null &&
    opportunityScore < opportunityScoreThreshold
  ) {
    disqualifiedReasons.push(
      `机会评分 ${opportunityScore} 低于 ${opportunityScoreThreshold}，暂不展示次优机会`
    );
  }

  if (
    opportunityScore !== null &&
    target.changePercent !== null &&
    target.changePercent > -3 &&
    macro.panicReboundMode.state === "off"
  ) {
    disqualifiedReasons.push("只有关键价位单一信号，缺少回撤或宏观反弹确认");
  }

  return {
    disqualifiedReasons: disqualifiedReasons.filter(Boolean),
    instrumentId: target.instrument.id,
    opportunityRank: null,
    opportunityReasons:
      opportunityReasons.length > 0
        ? opportunityReasons
        : target.action.reasons.slice(0, 3),
    opportunityScore,
    role: target.role,
    symbol: target.instrument.symbol,
    target
  };
}

function scoreOpportunityCandidate({
  macro,
  nearestActionableLevel,
  target
}: {
  macro: DashboardSnapshot["macro"];
  nearestActionableLevel: KeyLevelProximitySnapshot;
  target: DashboardTargetSnapshot;
}): number {
  const missingPenalty = target.action.evidence.missing.length * 8;
  const opposingPenalty = target.action.evidence.opposing.length * 6;
  const riskPenalty = target.action.evidence.risks.length * 4;
  const dropBonus =
    target.changePercent !== null && target.changePercent <= -5
      ? 18
      : target.changePercent !== null && target.changePercent <= -3
        ? 12
        : 0;
  const macroBonus =
    macro.panicReboundMode.state === "active"
      ? 18
      : macro.panicReboundMode.state === "watch"
        ? 10
        : 0;
  const actionBonus = target.action.kind === "consider_small_add" ? 15 : 8;
  const distanceBonus = Math.abs(nearestActionableLevel.distancePercent) <= 3 ? 12 : 6;
  const roleBonus = target.role !== "holding" ? 6 : 0;

  return Math.round(
    30 +
      actionBonus +
      distanceBonus +
      dropBonus +
      macroBonus +
      roleBonus -
      missingPenalty -
      opposingPenalty -
      riskPenalty
  );
}

function compareOpportunityEvaluations(
  left: InternalOpportunityEvaluation & { opportunityScore: number },
  right: InternalOpportunityEvaluation & { opportunityScore: number }
) {
  if (right.opportunityScore !== left.opportunityScore) {
    return right.opportunityScore - left.opportunityScore;
  }

  const rightPriority = right.target.watchlistItem?.priority ?? 0;
  const leftPriority = left.target.watchlistItem?.priority ?? 0;

  if (rightPriority !== leftPriority) {
    return rightPriority - leftPriority;
  }

  return left.symbol.localeCompare(right.symbol);
}

function createOpportunityAction(
  evaluation: InternalOpportunityEvaluation
): DashboardTrustActionRecommendation {
  return {
    ...evaluation.target.action,
    label: `今日重点观察：${evaluation.symbol} · ${evaluation.target.action.label}`,
    reasons: evaluation.opportunityReasons,
    ruleVersion: dashboardRuleVersion
  };
}

function createUnavailableOpportunityEvaluation({
  reason,
  target
}: {
  reason: string;
  target: DashboardTargetSnapshot;
}): DashboardOpportunityEvaluation {
  return {
    disqualifiedReasons: [reason],
    instrumentId: target.instrument.id,
    opportunityRank: null,
    opportunityReasons: target.action.reasons.slice(0, 3),
    opportunityScore: null,
    role: target.role,
    symbol: target.instrument.symbol
  };
}

function toPublicOpportunityEvaluation(
  evaluation: InternalOpportunityEvaluation
): DashboardOpportunityEvaluation {
  return {
    disqualifiedReasons: evaluation.disqualifiedReasons,
    instrumentId: evaluation.instrumentId,
    opportunityRank: evaluation.opportunityRank,
    opportunityReasons: evaluation.opportunityReasons,
    opportunityScore: evaluation.opportunityScore,
    role: evaluation.role,
    symbol: evaluation.symbol
  };
}

function createOpportunitySummaryDisqualifiedReasons(
  evaluations: InternalOpportunityEvaluation[]
) {
  const reasons = [
    ...new Set(evaluations.flatMap((evaluation) => evaluation.disqualifiedReasons))
  ];

  return reasons.length > 0
    ? reasons.slice(0, 4)
    : ["没有标的同时满足关键价位、数据质量和宏观过滤"];
}

function resolveOpportunitySummaryDataQuality(
  targets: DashboardTargetSnapshot[]
): DashboardDataQuality {
  if (targets.some((target) => target.action.dataQuality === "complete")) {
    return "complete";
  }

  if (targets.some((target) => target.action.dataQuality === "partial")) {
    return "partial";
  }

  if (targets.some((target) => target.action.dataQuality === "stale")) {
    return "stale";
  }

  return "unavailable";
}

function createEmptyOpportunityEvidence({
  basisDate,
  dataQuality,
  reason
}: {
  basisDate: string | null;
  dataQuality: DashboardDataQuality;
  reason: string;
}): DashboardEvidenceGroups {
  const evidence = createEmptyEvidence();
  const reasonItem = createEvidenceItem({
    basisDate,
    detail: null,
    impact: dataQuality === "complete" ? "neutral" : "missing",
    label: reason,
    source: dataQuality === "complete" ? "watchlist_items" : "market_data_daily"
  });

  evidence.supporting.push(
    createEvidenceItem({
      basisDate,
      detail: null,
      impact: "neutral",
      label: "机会扫描保持每日最多 0-1 个高质量标的",
      source: "watchlist_items"
    })
  );

  if (dataQuality === "complete") {
    evidence.opposing.push(reasonItem);
  } else {
    evidence.missing.push(reasonItem);
  }

  evidence.risks.push(
    createEvidenceItem({
      basisDate,
      detail: null,
      impact: "negative",
      label: "为满足交易冲动而展示次优机会，会降低信噪比",
      source: "watchlist_items"
    })
  );

  return evidence;
}
