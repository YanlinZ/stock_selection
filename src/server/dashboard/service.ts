import {
  calculateDailyChangePercent,
  calculateKeyLevelProximities,
  calculateMovingAverages,
  calculateRecentRange,
  calculateVolumeChange,
  createUnavailableMovingAverages,
  getLatestMarketPoint,
  roundPercent,
  sortMarketPoints
} from "./indicators";
import { createDashboardRepository, type DashboardRepository } from "./repository";
import { scoreMacroEnvironment } from "./macro-scoring";
import type {
  DashboardActionRecommendation,
  DashboardDataFreshness,
  DashboardInputSnapshot,
  DashboardKeyPriceLevelInput,
  DashboardMarketDataPoint,
  DashboardSnapshot,
  DashboardStatus,
  DashboardTargetRole,
  DashboardTargetSnapshot,
  KeyLevelProximitySnapshot
} from "./types";

type Clock = {
  now(): Date;
};

const defaultClock: Clock = {
  now: () => new Date()
};

const staleAfterDays = 7;
const macroMarketSymbols = new Set(["BTC", "ETH", "QQQ", "SPY", "TLT"]);

export function createDashboardService({
  clock = defaultClock,
  repository = createDashboardRepository()
}: {
  clock?: Clock;
  repository?: DashboardRepository;
} = {}) {
  return {
    async getDashboardSnapshot() {
      return createDashboardSnapshot(await repository.getDashboardInputs(), clock.now());
    }
  };
}

export function createDashboardSnapshot(
  input: DashboardInputSnapshot,
  now = new Date()
): DashboardSnapshot {
  const marketDataByInstrumentId = groupMarketDataByInstrumentId(input.marketData);
  const keyLevelsByInstrumentId = groupKeyLevelsByInstrumentId(input.keyPriceLevels);
  const holdingByInstrumentId = new Map(
    input.holdings.map((holding) => [holding.instrument.id, holding])
  );
  const watchlistByInstrumentId = new Map(
    input.watchlistItems.map((item) => [item.instrument.id, item])
  );
  const activeInstruments = [
    ...new Map(
      [...input.holdings, ...input.watchlistItems].map((item) => [
        item.instrument.id,
        item.instrument
      ])
    ).values()
  ].sort((left, right) => left.symbol.localeCompare(right.symbol));
  const dataFreshness = createDataFreshness(input, now);
  const macro = scoreMacroEnvironment({
    macroObservations: input.macroObservations,
    marketSeries: activeInstruments
      .filter((instrument) => macroMarketSymbols.has(instrument.symbol))
      .map((instrument) => ({
        points: marketDataByInstrumentId.get(instrument.id) ?? [],
        symbol: instrument.symbol
      }))
  });

  const targets = activeInstruments.map((instrument) => {
    const holding = holdingByInstrumentId.get(instrument.id) ?? null;
    const watchlistItem = watchlistByInstrumentId.get(instrument.id) ?? null;
    const role = resolveTargetRole(Boolean(holding), Boolean(watchlistItem));
    const points = marketDataByInstrumentId.get(instrument.id) ?? [];
    const keyLevels = keyLevelsByInstrumentId.get(instrument.id) ?? [];

    return createTargetSnapshot({
      dataFreshness,
      holding,
      keyLevels,
      macro,
      points,
      role,
      watchlistItem
    });
  });
  const keyLevelAlerts = createKeyLevelAlerts({
    keyPriceLevels: input.keyPriceLevels,
    marketDataByInstrumentId
  });
  const status = resolveDashboardStatus({
    configuredTargetCount: activeInstruments.length,
    dataFreshness,
    marketDataCount: input.marketData.length
  });

  return {
    dataFreshness,
    generatedAt: now.toISOString(),
    holdings: targets.filter((target) => target.role !== "watchlist"),
    keyLevelAlerts,
    macro,
    status,
    summary: createSummaryAction({
      dataFreshness,
      keyLevelAlerts,
      macro,
      status,
      targetCount: activeInstruments.length
    }),
    targets,
    watchlistItems: targets.filter((target) => target.role !== "holding")
  };
}

export function createUnavailableDashboardSnapshot({
  message,
  now = new Date()
}: {
  message: string;
  now?: Date;
}): DashboardSnapshot {
  const generatedAt = now.toISOString();
  const macro = scoreMacroEnvironment({
    macroObservations: [],
    marketSeries: []
  });

  return {
    dataFreshness: {
      generatedAt,
      isStale: false,
      latestMacroDate: null,
      latestMarketDate: null,
      latestRefreshStartedAt: null,
      latestRefreshStatus: null,
      warnings: [message]
    },
    generatedAt,
    holdings: [],
    keyLevelAlerts: [],
    macro,
    status: "unavailable",
    summary: {
      basisDate: null,
      kind: "refresh_data",
      label: "数据暂不可用，暂不输出交易建议。",
      reasons: [message],
      risks: ["数据读取失败时不应强行判断"]
    },
    targets: [],
    watchlistItems: []
  };
}

function createTargetSnapshot({
  dataFreshness,
  holding,
  keyLevels,
  macro,
  points,
  role,
  watchlistItem
}: {
  dataFreshness: DashboardDataFreshness;
  holding: DashboardTargetSnapshot["holding"];
  keyLevels: DashboardKeyPriceLevelInput[];
  macro: DashboardSnapshot["macro"];
  points: DashboardMarketDataPoint[];
  role: DashboardTargetRole;
  watchlistItem: DashboardTargetSnapshot["watchlistItem"];
}): DashboardTargetSnapshot {
  const instrument = (holding ?? watchlistItem)?.instrument;

  if (!instrument) {
    throw new Error("Dashboard target requires a holding or watchlist item.");
  }

  const sortedPoints = sortMarketPoints(points);
  const latest = getLatestMarketPoint(sortedPoints);

  if (!latest) {
    const unavailableAction: DashboardActionRecommendation = {
      basisDate: null,
      kind: "refresh_data",
      label: "数据不足，先刷新",
      reasons: [`${instrument.symbol} 暂无 normalized market_data_daily 收盘价`],
      risks: ["没有收盘级数据时不输出行动建议"]
    };

    return {
      action: unavailableAction,
      changePercent: null,
      dataStatus: "unavailable",
      holding,
      instrument,
      keyLevels: [],
      latestPrice: null,
      latestPriceDate: null,
      movingAverages: createUnavailableMovingAverages(),
      recentRange: {
        high: null,
        highDate: null,
        lookbackDays: 60,
        low: null,
        lowDate: null,
        status: "unavailable"
      },
      role,
      volumeChange: {
        averageVolume: null,
        latestVolume: null,
        message: "最新成交量不可用",
        percent: null,
        status: "unavailable"
      },
      watchlistItem
    };
  }

  const keyLevelProximities = calculateKeyLevelProximities({
    assetType: instrument.assetType,
    keyLevels,
    latestPrice: latest.close
  });
  const dataStatus = isDateStale(latest.date, dataFreshness.generatedAt)
    ? "stale"
    : "ready";
  const changePercent = calculateDailyChangePercent(sortedPoints);

  const movingAverages = calculateMovingAverages(sortedPoints);

  return {
    action: createTargetAction({
      changePercent,
      dataStatus,
      instrumentSymbol: instrument.symbol,
      keyLevelProximities,
      latest,
      macro,
      movingAverage200: movingAverages[200].value
    }),
    changePercent,
    dataStatus,
    holding,
    instrument,
    keyLevels: keyLevelProximities,
    latestPrice: latest.close,
    latestPriceDate: latest.date,
    movingAverages,
    recentRange: calculateRecentRange(sortedPoints),
    role,
    volumeChange: calculateVolumeChange(sortedPoints),
    watchlistItem
  };
}

function createTargetAction({
  changePercent,
  dataStatus,
  instrumentSymbol,
  keyLevelProximities,
  latest,
  macro,
  movingAverage200
}: {
  changePercent: number | null;
  dataStatus: DashboardStatus;
  instrumentSymbol: string;
  keyLevelProximities: KeyLevelProximitySnapshot[];
  latest: DashboardMarketDataPoint;
  macro: DashboardSnapshot["macro"];
  movingAverage200: number | null;
}): DashboardActionRecommendation {
  if (dataStatus === "stale") {
    return {
      basisDate: latest.date,
      kind: "refresh_data",
      label: "数据已过期，先刷新",
      reasons: [`${instrumentSymbol} 最新数据日期为 ${latest.date}`],
      risks: ["过期数据可能误判关键价位和趋势"]
    };
  }

  const nearestKeyLevel = keyLevelProximities.find((level) => level.isNear) ?? null;
  const reasons: string[] = [];
  const risks: string[] = [];

  if (nearestKeyLevel) {
    reasons.push(
      `${instrumentSymbol} 距 ${formatLevelType(nearestKeyLevel.level.levelType)} ${nearestKeyLevel.level.price} 为 ${nearestKeyLevel.distanceText}`
    );
  }

  if (changePercent !== null && changePercent <= -3) {
    reasons.push(`日跌幅 ${formatSignedPercent(changePercent)}，进入观察区`);
  }

  if (movingAverage200 !== null && latest.close < movingAverage200) {
    risks.push(`价格低于 200 日均线 ${movingAverage200}，长期趋势偏弱`);
  }

  if (macro.status === "panic_watch") {
    risks.push("宏观风险偏高，任何试探都应等待止跌确认");
  }

  if (nearestKeyLevel?.level.levelType === "risk") {
    return {
      basisDate: latest.date,
      kind: "risk_control",
      label: "接近风险价位，控制仓位",
      reasons:
        reasons.length > 0
          ? reasons
          : [`${instrumentSymbol} 接近个人风险价位`],
      risks:
        risks.length > 0
          ? risks
          : ["跌破风险位时，反弹假设可能失效"]
    };
  }

  if (
    nearestKeyLevel &&
    ["long_term_add", "support", "watch"].includes(nearestKeyLevel.level.levelType)
  ) {
    const kind =
      macro.panicReboundMode.state === "active" || (changePercent ?? 0) <= -3
        ? "consider_small_add"
        : "watch_key_level";

    return {
      basisDate: latest.date,
      kind,
      label: kind === "consider_small_add" ? "可小仓观察" : "接近关键价位，观察确认",
      reasons:
        reasons.length > 0 ? reasons : [`${instrumentSymbol} 接近个人关键价位`],
      risks:
        risks.length > 0
          ? risks
          : ["关键价位附近仍可能跌破，不能直接等同于买点"]
    };
  }

  return {
    basisDate: latest.date,
    kind: "wait",
    label: "不操作/观察",
    reasons:
      reasons.length > 0
        ? reasons
        : [`${instrumentSymbol} 暂无高质量触发条件`],
    risks:
      risks.length > 0
        ? risks
        : ["没有关键价位或止跌确认时，追高/抄底赔率不足"]
  };
}

function createSummaryAction({
  dataFreshness,
  keyLevelAlerts,
  macro,
  status,
  targetCount
}: {
  dataFreshness: DashboardDataFreshness;
  keyLevelAlerts: KeyLevelProximitySnapshot[];
  macro: DashboardSnapshot["macro"];
  status: DashboardStatus;
  targetCount: number;
}): DashboardActionRecommendation {
  if (targetCount === 0) {
    return {
      basisDate: null,
      kind: "refresh_data",
      label: "尚未配置持仓或关注列表，暂不输出交易建议。",
      reasons: ["Dashboard 需要 active holdings 或 watchlist_items"],
      risks: ["没有目标池时不应扫描全市场或强行推荐"]
    };
  }

  if (status === "unavailable") {
    return {
      basisDate: null,
      kind: "refresh_data",
      label: "数据不足，暂不输出交易建议，先刷新 normalized data。",
      reasons: ["缺少可用于 Dashboard 的 market_data_daily"],
      risks: ["信息不足时强行判断会误导交易"]
    };
  }

  if (status === "stale") {
    return {
      basisDate: dataFreshness.latestMarketDate,
      kind: "refresh_data",
      label: "数据已过期，建议先刷新数据，暂以观察为主。",
      reasons: ["最新收盘数据超过 7 天未更新"],
      risks: ["过期价格会影响均线、前高前低和关键价位距离"]
    };
  }

  if (macro.panicReboundMode.state === "active") {
    return {
      basisDate: macro.basisDate,
      kind: "watch_key_level",
      label: "市场恐慌升温，优先观察关键价位附近的分批机会。",
      reasons: macro.panicReboundMode.reasons,
      risks: macro.panicReboundMode.risks
    };
  }

  if (keyLevelAlerts.length > 0) {
    const nearest = keyLevelAlerts[0];

    return {
      basisDate: dataFreshness.latestMarketDate,
      kind: "watch_key_level",
      label: "有标的接近个人关键价位，建议观察确认，不追高。",
      reasons: [
        `${nearest.level.instrument.symbol} 距 ${formatLevelType(nearest.level.levelType)} ${nearest.level.price} 为 ${nearest.distanceText}`
      ],
      risks: ["关键价位需要止跌或放量确认，不能单独作为买入理由"]
    };
  }

  return {
    basisDate: dataFreshness.latestMarketDate ?? macro.basisDate,
    kind: "wait",
    label: "今日无高价值机会，建议不操作/观察。",
    reasons: ["未识别到恐慌反弹或关键价位触发"],
    risks: ["为了交易而交易容易降低胜率"]
  };
}

function createDataFreshness(
  input: DashboardInputSnapshot,
  now: Date
): DashboardDataFreshness {
  const latestMarketDate = maxDate(input.marketData.map((point) => point.date));
  const latestMacroDate = maxDate(
    input.macroObservations.map((observation) => observation.date)
  );
  const warnings: string[] = [];

  if (!latestMarketDate) {
    warnings.push("market_data_daily 暂无可用数据");
  } else if (isDateStale(latestMarketDate, now.toISOString())) {
    warnings.push(`market_data_daily 最新日期 ${latestMarketDate} 已超过 7 天`);
  }

  if (!latestMacroDate) {
    warnings.push("macro_observations 暂无可用数据");
  } else if (isDateStale(latestMacroDate, now.toISOString())) {
    warnings.push(`macro_observations 最新日期 ${latestMacroDate} 已超过 7 天`);
  }

  return {
    generatedAt: now.toISOString(),
    isStale:
      Boolean(latestMarketDate && isDateStale(latestMarketDate, now.toISOString())) ||
      Boolean(latestMacroDate && isDateStale(latestMacroDate, now.toISOString())),
    latestMacroDate,
    latestMarketDate,
    latestRefreshStartedAt: input.latestBatchRun?.startedAt.toISOString() ?? null,
    latestRefreshStatus: input.latestBatchRun?.status ?? null,
    warnings
  };
}

function resolveDashboardStatus({
  configuredTargetCount,
  dataFreshness,
  marketDataCount
}: {
  configuredTargetCount: number;
  dataFreshness: DashboardDataFreshness;
  marketDataCount: number;
}): DashboardStatus {
  if (configuredTargetCount === 0 || marketDataCount === 0) {
    return "unavailable";
  }

  if (dataFreshness.isStale) {
    return "stale";
  }

  return "ready";
}

function groupMarketDataByInstrumentId(points: DashboardMarketDataPoint[]) {
  return points.reduce((map, point) => {
    const existing = map.get(point.instrumentId) ?? [];
    existing.push(point);
    map.set(point.instrumentId, existing);
    return map;
  }, new Map<string, DashboardMarketDataPoint[]>());
}

function groupKeyLevelsByInstrumentId(keyLevels: DashboardKeyPriceLevelInput[]) {
  return keyLevels.reduce((map, level) => {
    const existing = map.get(level.instrument.id) ?? [];
    existing.push(level);
    map.set(level.instrument.id, existing);
    return map;
  }, new Map<string, DashboardKeyPriceLevelInput[]>());
}

function createKeyLevelAlerts({
  keyPriceLevels,
  marketDataByInstrumentId
}: {
  keyPriceLevels: DashboardKeyPriceLevelInput[];
  marketDataByInstrumentId: Map<string, DashboardMarketDataPoint[]>;
}) {
  return keyPriceLevels
    .flatMap((level) => {
      const latest = getLatestMarketPoint(
        marketDataByInstrumentId.get(level.instrument.id) ?? []
      );

      if (!latest) {
        return [];
      }

      return calculateKeyLevelProximities({
        assetType: level.instrument.assetType,
        keyLevels: [level],
        latestPrice: latest.close
      });
    })
    .filter((proximity) => proximity.isNear)
    .sort(
      (left, right) =>
        Math.abs(left.distancePercent) - Math.abs(right.distancePercent)
    );
}

function resolveTargetRole(
  hasHolding: boolean,
  hasWatchlistItem: boolean
): DashboardTargetRole {
  if (hasHolding && hasWatchlistItem) {
    return "both";
  }

  return hasHolding ? "holding" : "watchlist";
}

function isDateStale(date: string, nowIso: string) {
  const dataTime = new Date(`${date}T00:00:00.000Z`);
  const now = new Date(nowIso);
  const staleAfterMs = staleAfterDays * 24 * 60 * 60 * 1000;

  return now.getTime() - dataTime.getTime() > staleAfterMs;
}

function maxDate(dates: string[]) {
  return dates.sort().at(-1) ?? null;
}

function formatLevelType(levelType: DashboardKeyPriceLevelInput["levelType"]) {
  const labels: Record<DashboardKeyPriceLevelInput["levelType"], string> = {
    long_term_add: "长期加仓价",
    resistance: "压力位",
    risk: "风险位",
    support: "支撑位",
    watch: "观察价"
  };

  return labels[levelType];
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${roundPercent(value).toFixed(1)}%`;
}
