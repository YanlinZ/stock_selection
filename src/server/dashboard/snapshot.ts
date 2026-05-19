import {
  calculateKeyLevelProximities,
  getLatestMarketPoint
} from "./indicators";
import {
  createDashboardDataSources,
  createOpportunityDataSources
} from "./data-sources";
import {
  createEmptyOpportunitySummary,
  createOpportunitySummary
} from "./opportunity-scan";
import { scoreMacroEnvironment } from "./macro-scoring";
import {
  formatLevelType,
  isDateStale,
  maxDate
} from "./shared";
import { createTargetSnapshot } from "./target-decisions";
import type {
  DashboardActionRecommendation,
  DashboardDataFreshness,
  DashboardInputSnapshot,
  DashboardKeyPriceLevelInput,
  DashboardMarketDataPoint,
  DashboardSnapshot,
  DashboardStatus,
  DashboardTargetRole,
  KeyLevelProximitySnapshot
} from "./types";

const macroMarketSymbols = new Set(["BTC", "ETH", "QQQ", "SPY", "TLT"]);

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
  const status = resolveDashboardStatus({
    configuredTargetCount: activeInstruments.length,
    dataFreshness,
    marketDataCount: input.marketData.length
  });
  const macro = scoreMacroEnvironment({
    macroObservations: input.macroObservations,
    marketSeries: activeInstruments
      .filter((instrument) => macroMarketSymbols.has(instrument.symbol))
      .map((instrument) => ({
        points: marketDataByInstrumentId.get(instrument.id) ?? [],
        symbol: instrument.symbol
      }))
  });
  const dataSources = createDashboardDataSources({
    dataFreshness,
    latestBatchRun: input.latestBatchRun,
    macroObservations: input.macroObservations,
    macroStatus: macro.status,
    now,
    status
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
  const opportunity = createOpportunitySummary({
    dataFreshness,
    macro,
    status,
    targets
  });

  return {
    dataSources,
    dataFreshness,
    generatedAt: now.toISOString(),
    holdings: targets.filter((target) => target.role !== "watchlist"),
    keyLevelAlerts,
    macro,
    opportunity,
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
  const dataFreshness = {
    generatedAt,
    isStale: false,
    latestMacroDate: null,
    latestMarketDate: null,
    latestRefreshStartedAt: null,
    latestRefreshStatus: null,
    warnings: [message]
  };
  const macro = scoreMacroEnvironment({
    macroObservations: [],
    marketSeries: []
  });
  const dataSources = createDashboardDataSources({
    dataFreshness,
    latestBatchRun: null,
    macroObservations: [],
    macroStatus: macro.status,
    now,
    status: "unavailable"
  });

  return {
    dataSources,
    dataFreshness,
    generatedAt,
    holdings: [],
    keyLevelAlerts: [],
    macro,
    opportunity: createEmptyOpportunitySummary({
      basisDate: null,
      dataQuality: "unavailable",
      dataSources: createOpportunityDataSources({
        dataFreshness,
        status: "unavailable"
      }),
      evaluatedTargetCount: 0,
      evaluations: [],
      reason: message
    }),
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
