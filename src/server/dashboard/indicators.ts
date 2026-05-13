import type {
  DashboardKeyPriceLevelInput,
  DashboardMarketDataPoint,
  IndicatorValue,
  KeyLevelProximitySnapshot,
  MovingAverageSnapshot,
  MovingAverageWindow,
  RecentRangeSnapshot,
  VolumeChangeSnapshot
} from "./types";
import type { AssetType } from "@/server/config/types";

const movingAverageWindows: MovingAverageWindow[] = [8, 21, 50, 200];

export function sortMarketPoints(points: DashboardMarketDataPoint[]) {
  return [...points].sort((left, right) => left.date.localeCompare(right.date));
}

export function getLatestMarketPoint(points: DashboardMarketDataPoint[]) {
  return sortMarketPoints(points).at(-1) ?? null;
}

export function calculateDailyChangePercent(points: DashboardMarketDataPoint[]) {
  const sorted = sortMarketPoints(points);
  const latest = sorted.at(-1);
  const previous = sorted.at(-2);

  if (!latest || !previous || previous.close === 0) {
    return null;
  }

  return roundPercent(((latest.close - previous.close) / previous.close) * 100);
}

export function calculateMovingAverages(
  points: DashboardMarketDataPoint[]
): MovingAverageSnapshot {
  const sorted = sortMarketPoints(points);

  return movingAverageWindows.reduce((snapshot, window) => {
    snapshot[window] = calculateMovingAverage(sorted, window);
    return snapshot;
  }, {} as MovingAverageSnapshot);
}

export function calculateRecentRange(
  points: DashboardMarketDataPoint[],
  lookbackDays = 60
): RecentRangeSnapshot {
  const sorted = sortMarketPoints(points);
  const window = sorted.slice(-lookbackDays);

  if (window.length === 0) {
    return {
      high: null,
      highDate: null,
      lookbackDays,
      low: null,
      lowDate: null,
      status: "unavailable"
    };
  }

  const initial = window[0];
  let high = initial.high ?? initial.close;
  let highDate = initial.date;
  let low = initial.low ?? initial.close;
  let lowDate = initial.date;

  for (const point of window) {
    const pointHigh = point.high ?? point.close;
    const pointLow = point.low ?? point.close;

    if (pointHigh > high) {
      high = pointHigh;
      highDate = point.date;
    }

    if (pointLow < low) {
      low = pointLow;
      lowDate = point.date;
    }
  }

  return {
    high: roundPrice(high),
    highDate,
    lookbackDays,
    low: roundPrice(low),
    lowDate,
    status: "ready"
  };
}

export function calculateVolumeChange(
  points: DashboardMarketDataPoint[],
  lookbackDays = 20
): VolumeChangeSnapshot {
  const sorted = sortMarketPoints(points);
  const latest = sorted.at(-1);

  if (!latest?.volume) {
    return {
      averageVolume: null,
      latestVolume: latest?.volume ?? null,
      message: "最新成交量不可用",
      percent: null,
      status: "unavailable"
    };
  }

  const previousVolumes = sorted
    .slice(0, -1)
    .slice(-lookbackDays)
    .map((point) => point.volume)
    .filter((volume): volume is number => typeof volume === "number" && volume > 0);

  if (previousVolumes.length < Math.min(5, lookbackDays)) {
    return {
      averageVolume: null,
      latestVolume: latest.volume,
      message: "历史成交量不足",
      percent: null,
      status: "unavailable"
    };
  }

  const averageVolume =
    previousVolumes.reduce((total, volume) => total + volume, 0) /
    previousVolumes.length;

  return {
    averageVolume: Math.round(averageVolume),
    latestVolume: latest.volume,
    message: null,
    percent: roundPercent(((latest.volume - averageVolume) / averageVolume) * 100),
    status: "ready"
  };
}

export function calculateKeyLevelProximities({
  assetType,
  keyLevels,
  latestPrice
}: {
  assetType: AssetType;
  keyLevels: DashboardKeyPriceLevelInput[];
  latestPrice: number;
}): KeyLevelProximitySnapshot[] {
  const thresholdPercent = resolveKeyLevelThreshold(assetType);

  return keyLevels
    .map((level) => {
      const distancePercent = roundPercent(
        ((latestPrice - level.price) / level.price) * 100
      );
      const absoluteDistance = Math.abs(distancePercent);
      const state: KeyLevelProximitySnapshot["state"] =
        absoluteDistance <= thresholdPercent
          ? "near"
          : latestPrice < level.price
            ? "below"
            : "above";

      return {
        distancePercent,
        distanceText: formatSignedPercent(distancePercent),
        isNear: absoluteDistance <= thresholdPercent,
        level,
        state,
        thresholdPercent
      };
    })
    .sort(
      (left, right) =>
        Math.abs(left.distancePercent) - Math.abs(right.distancePercent)
    );
}

export function createUnavailableMovingAverages(): MovingAverageSnapshot {
  return movingAverageWindows.reduce((snapshot, window) => {
    snapshot[window] = {
      message: `需要至少 ${window} 个交易日数据`,
      status: "unavailable",
      value: null
    };
    return snapshot;
  }, {} as MovingAverageSnapshot);
}

export function roundPrice(value: number) {
  return round(value, 2);
}

export function roundPercent(value: number) {
  return round(value, 1);
}

function calculateMovingAverage(
  sortedPoints: DashboardMarketDataPoint[],
  window: MovingAverageWindow
): IndicatorValue {
  if (sortedPoints.length < window) {
    return {
      message: `需要至少 ${window} 个交易日数据`,
      status: "unavailable",
      value: null
    };
  }

  const values = sortedPoints.slice(-window).map((point) => point.close);
  const average = values.reduce((total, value) => total + value, 0) / values.length;

  return {
    message: null,
    status: "ready",
    value: roundPrice(average)
  };
}

function resolveKeyLevelThreshold(assetType: AssetType) {
  if (assetType === "crypto") {
    return 5;
  }

  if (assetType === "etf" || assetType === "index") {
    return 2.5;
  }

  return 3;
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
