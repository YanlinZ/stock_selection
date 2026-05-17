import { sortMarketPoints } from "./indicators";
import { formatLevelType, formatSignedPercent } from "./shared";
import type {
  DashboardActionKind,
  DashboardDecisionKeyLevelSnapshot,
  DashboardMarketDataPoint,
  DashboardPlanStatusSnapshot,
  KeyLevelProximitySnapshot
} from "./types";
import type { KeyPriceLevelType } from "@/server/config/types";

type PlanStatusLevel = {
  distancePercent: number;
  distanceText: string;
  levelPrice: number;
  levelType: KeyPriceLevelType;
  thresholdPercent: number;
};

type CurrentPlanStatusInput = {
  actionKind: DashboardActionKind;
  basisDate: string | null;
  keyLevels: KeyLevelProximitySnapshot[];
  latestPrice: number | null;
  latestPriceDate: string | null;
};

type HistoricalPlanStatusInput = {
  actionKind: DashboardActionKind;
  asOfDate: string;
  basisDate: string | null;
  instrumentId: string | null;
  keyLevels: DashboardDecisionKeyLevelSnapshot[];
  marketData: DashboardMarketDataPoint[];
};

export function calculateCurrentPlanStatus({
  actionKind,
  basisDate,
  keyLevels,
  latestPrice,
  latestPriceDate
}: CurrentPlanStatusInput): DashboardPlanStatusSnapshot {
  return calculatePlanStatus({
    actionKind,
    basisDate,
    latestPrice,
    latestPriceDate,
    levels: keyLevels.map((level) => ({
      distancePercent: level.distancePercent,
      distanceText: level.distanceText,
      levelPrice: level.level.price,
      levelType: level.level.levelType,
      thresholdPercent: level.thresholdPercent
    }))
  });
}

export function calculateHistoricalPlanStatus({
  actionKind,
  asOfDate,
  basisDate,
  instrumentId,
  keyLevels,
  marketData
}: HistoricalPlanStatusInput): DashboardPlanStatusSnapshot {
  if (!instrumentId) {
    return createInsufficientPlanStatus({
      basisDate,
      latestPrice: null,
      latestPriceDate: null,
      message: "缺少可关联标的，无法追踪计划状态。"
    });
  }

  const latest = sortMarketPoints(
    marketData.filter(
      (point) => point.instrumentId === instrumentId && point.date <= asOfDate
    )
  ).at(-1);

  return calculatePlanStatus({
    actionKind,
    basisDate,
    latestPrice: latest?.close ?? null,
    latestPriceDate: latest?.date ?? null,
    levels: keyLevels.map((level) => {
      const distancePercent =
        latest && level.price > 0
          ? ((latest.close - level.price) / level.price) * 100
          : (level.distancePercent ?? 0);

      return {
        distancePercent,
        distanceText: formatSignedPercent(distancePercent),
        levelPrice: level.price,
        levelType: level.levelType,
        thresholdPercent: level.thresholdPercent
      };
    })
  });
}

function calculatePlanStatus({
  actionKind,
  basisDate,
  latestPrice,
  latestPriceDate,
  levels
}: {
  actionKind: DashboardActionKind;
  basisDate: string | null;
  latestPrice: number | null;
  latestPriceDate: string | null;
  levels: PlanStatusLevel[];
}): DashboardPlanStatusSnapshot {
  if (latestPrice === null || !latestPriceDate) {
    return createInsufficientPlanStatus({
      basisDate,
      latestPrice,
      latestPriceDate,
      message: "缺少最新 normalized price，无法追踪计划状态。"
    });
  }

  if (levels.length === 0) {
    return createInsufficientPlanStatus({
      basisDate,
      latestPrice,
      latestPriceDate,
      message: "缺少可追踪关键价位，无法判断接近、触发或失效。"
    });
  }

  const sortedLevels = [...levels].sort(
    (left, right) =>
      Math.abs(left.distancePercent) - Math.abs(right.distancePercent)
  );
  const invalidatedLevel = sortedLevels.find(isInvalidatedLevel);

  if (invalidatedLevel) {
    return createPlanStatus({
      basisDate,
      latestPrice,
      latestPriceDate,
      level: invalidatedLevel,
      message: `最新价格已跌破${formatLevelType(invalidatedLevel.levelType)}，原计划视为失效。`,
      status: "invalidated"
    });
  }

  const triggeredLevel = sortedLevels.find((level) =>
    Math.abs(level.distancePercent) <= level.thresholdPercent
  );

  if (triggeredLevel) {
    return createPlanStatus({
      basisDate,
      latestPrice,
      latestPriceDate,
      level: triggeredLevel,
      message: `最新价格已触发${formatLevelType(triggeredLevel.levelType)}。`,
      status: "triggered"
    });
  }

  const approachingLevel = sortedLevels.find(
    (level) => Math.abs(level.distancePercent) <= level.thresholdPercent * 2
  );

  if (approachingLevel) {
    return createPlanStatus({
      basisDate,
      latestPrice,
      latestPriceDate,
      level: approachingLevel,
      message: `最新价格正在接近${formatLevelType(approachingLevel.levelType)}。`,
      status: "approaching"
    });
  }

  const nearestLevel = sortedLevels[0];

  return createPlanStatus({
    basisDate,
    latestPrice,
    latestPriceDate,
    level: nearestLevel,
    message:
      actionKind === "wait"
        ? `最新价格未接近${formatLevelType(nearestLevel.levelType)}，保持观察。`
        : `最新价格距离${formatLevelType(nearestLevel.levelType)}仍有空间，原计划仍有效。`,
    status: "still_valid"
  });
}

function isInvalidatedLevel(level: PlanStatusLevel) {
  return (
    (level.levelType === "risk" || level.levelType === "support") &&
    level.distancePercent < -level.thresholdPercent
  );
}

function createPlanStatus({
  basisDate,
  latestPrice,
  latestPriceDate,
  level,
  message,
  status
}: {
  basisDate: string | null;
  latestPrice: number;
  latestPriceDate: string;
  level: PlanStatusLevel;
  message: string;
  status: DashboardPlanStatusSnapshot["status"];
}): DashboardPlanStatusSnapshot {
  return {
    basisDate,
    distancePercent: roundPercent(level.distancePercent),
    distanceText: formatSignedPercent(level.distancePercent),
    label: formatPlanStatus(status),
    latestPrice,
    latestPriceDate,
    levelPrice: level.levelPrice,
    levelType: level.levelType,
    message,
    status
  };
}

function createInsufficientPlanStatus({
  basisDate,
  latestPrice,
  latestPriceDate,
  message
}: {
  basisDate: string | null;
  latestPrice: number | null;
  latestPriceDate: string | null;
  message: string;
}): DashboardPlanStatusSnapshot {
  return {
    basisDate,
    distancePercent: null,
    distanceText: null,
    label: formatPlanStatus("insufficient_data"),
    latestPrice,
    latestPriceDate,
    levelPrice: null,
    levelType: null,
    message,
    status: "insufficient_data"
  };
}

function formatPlanStatus(status: DashboardPlanStatusSnapshot["status"]) {
  const labels: Record<DashboardPlanStatusSnapshot["status"], string> = {
    approaching: "接近",
    insufficient_data: "数据不足",
    invalidated: "已失效",
    still_valid: "仍有效",
    triggered: "已触发"
  };

  return labels[status];
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}
