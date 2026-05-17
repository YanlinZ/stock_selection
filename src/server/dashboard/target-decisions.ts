import {
  calculateDailyChangePercent,
  calculateKeyLevelProximities,
  calculateMovingAverages,
  calculateRecentRange,
  calculateVolumeChange,
  createUnavailableMovingAverages,
  getLatestMarketPoint,
  sortMarketPoints
} from "./indicators";
import {
  createConfigurationDataSource,
  createPriceDataSource,
  createTechnicalDataSource
} from "./data-sources";
import {
  createEmptyEvidence,
  createEvidenceItem,
  createTrustAction,
  dashboardRuleVersion,
  formatLevelType,
  formatSignedPercent,
  isDateStale
} from "./shared";
import { calculateCurrentPlanStatus } from "./plan-status";
import type {
  DashboardDataFreshness,
  DashboardDataQuality,
  DashboardDataSourceSnapshot,
  DashboardEvidenceGroups,
  DashboardEvidenceItem,
  DashboardKeyPriceLevelInput,
  DashboardMarketDataPoint,
  DashboardSnapshot,
  DashboardStatus,
  DashboardTargetRole,
  DashboardTargetSnapshot,
  DashboardTrustActionRecommendation,
  KeyLevelProximitySnapshot
} from "./types";

export function createTargetSnapshot({
  dataFreshness,
  holding,
  ingestionDataSource,
  keyLevels,
  macro,
  macroDataSource,
  points,
  role,
  watchlistItem
}: {
  dataFreshness: DashboardDataFreshness;
  holding: DashboardTargetSnapshot["holding"];
  ingestionDataSource: DashboardDataSourceSnapshot | null;
  keyLevels: DashboardKeyPriceLevelInput[];
  macro: DashboardSnapshot["macro"];
  macroDataSource: DashboardDataSourceSnapshot;
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
  const configurationDataSource = createConfigurationDataSource({
    holding,
    keyLevels,
    watchlistItem
  });

  if (!latest) {
    const dataSources = [
      createPriceDataSource({
        latest: null,
        status: "unavailable"
      }),
      createTechnicalDataSource({
        latest: null,
        pointCount: sortedPoints.length,
        readyCount: 0,
        status: "unavailable"
      }),
      macroDataSource,
      configurationDataSource,
      ...(ingestionDataSource ? [ingestionDataSource] : [])
    ];
    const evidence = createUnavailableEvidence({
      instrumentSymbol: instrument.symbol,
      source: holding ? "holdings" : "watchlist_items"
    });
    const unavailableAction: DashboardTrustActionRecommendation = {
      basisDate: null,
      confidence: "low",
      dataQuality: "unavailable",
      dataSources,
      evidence,
      kind: "refresh_data",
      label: "数据不足，先刷新",
      reasons: [...evidence.supporting, ...evidence.missing].map(
        (item) => item.label
      ),
      risks: evidence.risks.map((item) => item.label),
      ruleVersion: dashboardRuleVersion
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
      planStatus: calculateCurrentPlanStatus({
        actionKind: unavailableAction.kind,
        basisDate: unavailableAction.basisDate,
        keyLevels: [],
        latestPrice: null,
        latestPriceDate: null
      }),
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
  const recentRange = calculateRecentRange(sortedPoints);
  const volumeChange = calculateVolumeChange(sortedPoints);
  const dataQuality = resolveTargetDataQuality({
    dataFreshness,
    dataStatus,
    keyLevels,
    macro,
    movingAverages,
    recentRange,
    volumeChange
  });
  const dataSources = [
    createPriceDataSource({
      latest,
      status: dataStatus === "stale" ? "stale" : "ready"
    }),
    createTechnicalDataSource({
      latest,
      pointCount: sortedPoints.length,
      readyCount: Object.values(movingAverages).filter(
        (indicator) => indicator.status === "ready"
      ).length,
      status:
        dataQuality === "stale"
          ? "stale"
          : dataQuality === "complete"
            ? "ready"
            : "partial"
    }),
    macroDataSource,
    configurationDataSource,
    ...(ingestionDataSource ? [ingestionDataSource] : [])
  ];
  const action = createTargetAction({
    changePercent,
    dataQuality,
    dataSources,
    instrumentSymbol: instrument.symbol,
    keyLevelProximities,
    latest,
    macro,
    movingAverages,
    recentRange,
    volumeChange
  });

  return {
    action,
    changePercent,
    dataStatus,
    holding,
    instrument,
    keyLevels: keyLevelProximities,
    latestPrice: latest.close,
    latestPriceDate: latest.date,
    movingAverages,
    planStatus: calculateCurrentPlanStatus({
      actionKind: action.kind,
      basisDate: action.basisDate,
      keyLevels: keyLevelProximities,
      latestPrice: latest.close,
      latestPriceDate: latest.date
    }),
    recentRange,
    role,
    volumeChange,
    watchlistItem
  };
}

function createTargetAction({
  changePercent,
  dataQuality,
  dataSources,
  instrumentSymbol,
  keyLevelProximities,
  latest,
  macro,
  movingAverages,
  recentRange,
  volumeChange
}: {
  changePercent: number | null;
  dataQuality: DashboardDataQuality;
  dataSources: DashboardDataSourceSnapshot[];
  instrumentSymbol: string;
  keyLevelProximities: KeyLevelProximitySnapshot[];
  latest: DashboardMarketDataPoint;
  macro: DashboardSnapshot["macro"];
  movingAverages: DashboardTargetSnapshot["movingAverages"];
  recentRange: DashboardTargetSnapshot["recentRange"];
  volumeChange: DashboardTargetSnapshot["volumeChange"];
}): DashboardTrustActionRecommendation {
  const evidence = createTargetEvidence({
    changePercent,
    dataQuality,
    instrumentSymbol,
    keyLevelProximities,
    latest,
    macro,
    movingAverages,
    recentRange,
    volumeChange
  });

  if (dataQuality === "stale") {
    const action = createTrustAction({
      basisDate: latest.date,
      dataQuality,
      dataSources,
      evidence,
      kind: "refresh_data",
      label: "数据已过期，先刷新",
      riskFallback: "过期数据可能误判关键价位和趋势"
    });

    return action;
  }

  const nearestKeyLevel = keyLevelProximities.find((level) => level.isNear) ?? null;

  if (nearestKeyLevel?.level.levelType === "risk") {
    return createTrustAction({
      basisDate: latest.date,
      dataQuality,
      dataSources,
      evidence,
      kind: "risk_control",
      label: "接近风险价位，控制仓位",
      reasonFallback: `${instrumentSymbol} 接近个人风险价位`,
      riskFallback: "跌破风险位时，反弹假设可能失效"
    });
  }

  if (
    nearestKeyLevel &&
    ["long_term_add", "support", "watch"].includes(nearestKeyLevel.level.levelType)
  ) {
    const kind =
      dataQuality === "complete" &&
      (macro.panicReboundMode.state === "active" || (changePercent ?? 0) <= -3)
        ? "consider_small_add"
        : "watch_key_level";

    return createTrustAction({
      basisDate: latest.date,
      dataQuality,
      dataSources,
      evidence,
      kind,
      label: kind === "consider_small_add" ? "可小仓观察" : "接近关键价位，观察确认",
      reasonFallback: `${instrumentSymbol} 接近个人关键价位`,
      riskFallback: "关键价位附近仍可能跌破，不能直接等同于买点"
    });
  }

  return createTrustAction({
    basisDate: latest.date,
    dataQuality,
    dataSources,
    evidence,
    kind: "wait",
    label: "不操作/观察",
    reasonFallback: `${instrumentSymbol} 暂无高质量触发条件`,
    riskFallback: "没有关键价位或止跌确认时，追高/抄底赔率不足"
  });
}

function createTargetEvidence({
  changePercent,
  dataQuality,
  instrumentSymbol,
  keyLevelProximities,
  latest,
  macro,
  movingAverages,
  recentRange,
  volumeChange
}: {
  changePercent: number | null;
  dataQuality: DashboardDataQuality;
  instrumentSymbol: string;
  keyLevelProximities: KeyLevelProximitySnapshot[];
  latest: DashboardMarketDataPoint;
  macro: DashboardSnapshot["macro"];
  movingAverages: DashboardTargetSnapshot["movingAverages"];
  recentRange: DashboardTargetSnapshot["recentRange"];
  volumeChange: DashboardTargetSnapshot["volumeChange"];
}): DashboardEvidenceGroups {
  const evidence = createEmptyEvidence();
  const nearestKeyLevel = keyLevelProximities.find((level) => level.isNear) ?? null;
  const movingAverage200 = movingAverages[200];

  if (dataQuality === "stale") {
    evidence.missing.push(
      createEvidenceItem({
        basisDate: latest.date,
        detail: `最新价格日期 ${latest.date}`,
        impact: "missing",
        label: "价格或宏观数据已超过 7 天",
        source: "market_data_daily"
      })
    );
    evidence.risks.push(
      createEvidenceItem({
        basisDate: latest.date,
        detail: null,
        impact: "negative",
        label: "过期数据可能误判关键价位和趋势",
        source: "market_data_daily"
      })
    );
  }

  if (nearestKeyLevel) {
    const levelLabel = formatLevelType(nearestKeyLevel.level.levelType);
    const label = `${instrumentSymbol} 距 ${levelLabel} ${nearestKeyLevel.level.price} 为 ${nearestKeyLevel.distanceText}`;
    const targetGroup =
      nearestKeyLevel.level.levelType === "risk" ? evidence.risks : evidence.supporting;

    targetGroup.push(
      createEvidenceItem({
        basisDate: latest.date,
        detail: nearestKeyLevel.level.notes,
        impact:
          nearestKeyLevel.level.levelType === "risk" ? "negative" : "positive",
        label,
        source: "key_price_levels"
      })
    );
  } else if (keyLevelProximities.length > 0) {
    evidence.opposing.push(
      createEvidenceItem({
        basisDate: latest.date,
        detail: `最近距离 ${keyLevelProximities[0]?.distanceText ?? "暂无"}`,
        impact: "neutral",
        label: "尚未贴近已配置的个人关键价位",
        source: "key_price_levels"
      })
    );
  } else {
    evidence.missing.push(
      createEvidenceItem({
        basisDate: null,
        detail: null,
        impact: "missing",
        label: "未配置个人关键价位，价格触发依据不足",
        source: "key_price_levels"
      })
    );
  }

  if (changePercent !== null && changePercent <= -3) {
    evidence.supporting.push(
      createEvidenceItem({
        basisDate: latest.date,
        detail: formatSignedPercent(changePercent),
        impact: "positive",
        label: "日跌幅进入观察区",
        source: "market_data_daily"
      })
    );
  }

  if (movingAverage200.value !== null) {
    if (latest.close < movingAverage200.value) {
      evidence.opposing.push(
        createEvidenceItem({
          basisDate: latest.date,
          detail: `MA200 ${movingAverage200.value}`,
          impact: "negative",
          label: "价格低于 200 日均线，长期趋势偏弱",
          source: "market_data_daily"
        })
      );
      evidence.risks.push(
        createEvidenceItem({
          basisDate: latest.date,
          detail: null,
          impact: "negative",
          label: "长期趋势未修复前，反弹容易失败",
          source: "market_data_daily"
        })
      );
    } else {
      evidence.supporting.push(
        createEvidenceItem({
          basisDate: latest.date,
          detail: `MA200 ${movingAverage200.value}`,
          impact: "positive",
          label: "价格仍高于 200 日均线",
          source: "market_data_daily"
        })
      );
    }
  } else {
    evidence.missing.push(
      createEvidenceItem({
        basisDate: latest.date,
        detail: movingAverage200.message,
        impact: "missing",
        label: "MA200 不可用，长期趋势证据不足",
        source: "market_data_daily"
      })
    );
  }

  if (volumeChange.status === "unavailable") {
    evidence.missing.push(
      createEvidenceItem({
        basisDate: latest.date,
        detail: volumeChange.message,
        impact: "missing",
        label: "成交量证据不足",
        source: "market_data_daily"
      })
    );
  }

  if (recentRange.status === "unavailable") {
    evidence.missing.push(
      createEvidenceItem({
        basisDate: latest.date,
        detail: `需要近 ${recentRange.lookbackDays} 日高低区间`,
        impact: "missing",
        label: "近高/近低区间不可用",
        source: "market_data_daily"
      })
    );
  }

  if (macro.status === "panic_watch") {
    evidence.supporting.push(
      createEvidenceItem({
        basisDate: macro.basisDate,
        detail: macro.panicReboundMode.label,
        impact: "positive",
        label: "宏观进入恐慌反弹观察区",
        source: "macro_observations"
      })
    );
    evidence.risks.push(
      createEvidenceItem({
        basisDate: macro.basisDate,
        detail: null,
        impact: "negative",
        label: "宏观风险偏高，任何试探都应等待止跌确认",
        source: "macro_observations"
      })
    );
  } else if (macro.status === "elevated") {
    evidence.opposing.push(
      createEvidenceItem({
        basisDate: macro.basisDate,
        detail: `市场风险评分 ${macro.marketRiskScore ?? "N/A"}/100`,
        impact: "negative",
        label: "宏观风险偏高，降低行动置信度",
        source: "macro_observations"
      })
    );
  } else if (macro.status === "insufficient") {
    evidence.missing.push(
      createEvidenceItem({
        basisDate: null,
        detail: null,
        impact: "missing",
        label: "宏观数据不足，无法校准市场风险",
        source: "macro_observations"
      })
    );
  }

  if (dataQuality === "partial") {
    evidence.risks.push(
      createEvidenceItem({
        basisDate: latest.date,
        detail: null,
        impact: "negative",
        label: "部分关键输入缺失，建议只观察确认",
        source: "market_data_daily"
      })
    );
  }

  return evidence;
}

function createUnavailableEvidence({
  instrumentSymbol,
  source
}: {
  instrumentSymbol: string;
  source: DashboardEvidenceItem["source"];
}): DashboardEvidenceGroups {
  return {
    missing: [
      createEvidenceItem({
        basisDate: null,
        detail: null,
        impact: "missing",
        label: `${instrumentSymbol} 暂无 normalized market_data_daily 收盘价`,
        source: "market_data_daily"
      })
    ],
    opposing: [],
    risks: [
      createEvidenceItem({
        basisDate: null,
        detail: null,
        impact: "negative",
        label: "没有收盘级数据时不输出行动建议",
        source: "market_data_daily"
      })
    ],
    supporting: [
      createEvidenceItem({
        basisDate: null,
        detail: null,
        impact: "neutral",
        label: "该标的仍是 active 持仓或关注对象",
        source
      })
    ]
  };
}

function resolveTargetDataQuality({
  dataFreshness,
  dataStatus,
  keyLevels,
  macro,
  movingAverages,
  recentRange,
  volumeChange
}: {
  dataFreshness: DashboardDataFreshness;
  dataStatus: DashboardStatus;
  keyLevels: DashboardKeyPriceLevelInput[];
  macro: DashboardSnapshot["macro"];
  movingAverages: DashboardTargetSnapshot["movingAverages"];
  recentRange: DashboardTargetSnapshot["recentRange"];
  volumeChange: DashboardTargetSnapshot["volumeChange"];
}): DashboardDataQuality {
  if (dataStatus === "unavailable") {
    return "unavailable";
  }

  if (
    dataStatus === "stale" ||
    Boolean(
      dataFreshness.latestMacroDate &&
        isDateStale(dataFreshness.latestMacroDate, dataFreshness.generatedAt)
    )
  ) {
    return "stale";
  }

  const movingAveragesReady = Object.values(movingAverages).every(
    (indicator) => indicator.status === "ready"
  );
  const hasCompleteInputs =
    movingAveragesReady &&
    recentRange.status === "ready" &&
    volumeChange.status === "ready" &&
    macro.status !== "insufficient" &&
    keyLevels.length > 0;

  return hasCompleteInputs ? "complete" : "partial";
}
