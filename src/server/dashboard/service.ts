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
  DashboardDataQuality,
  DashboardDataSourceSnapshot,
  DashboardDecisionSnapshotRecord,
  DashboardEvidenceGroups,
  DashboardEvidenceItem,
  DashboardInputSnapshot,
  DashboardKeyPriceLevelInput,
  DashboardMarketDataPoint,
  DashboardOpportunitySummary,
  DashboardSnapshot,
  DashboardStatus,
  DashboardTargetSnapshot,
  DashboardTargetRole,
  DashboardTrustActionRecommendation,
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
export const dashboardRuleVersion = "dashboard-rules-v3.0.0";

export function createDashboardService({
  clock = defaultClock,
  repository = createDashboardRepository()
}: {
  clock?: Clock;
  repository?: DashboardRepository;
} = {}) {
  return {
    async getDashboardSnapshot() {
      const snapshot = createDashboardSnapshot(
        await repository.getDashboardInputs(),
        clock.now()
      );

      try {
        await repository.persistDailyDecisionSnapshots?.(
          createDailyDecisionSnapshotRecords(snapshot)
        );
      } catch {
        // Snapshot persistence is a replay aid; Dashboard rendering should degrade safely.
      }

      return snapshot;
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
  const macroDataSource = createMacroDataSource({
    macroObservations: input.macroObservations,
    macroStatus: macro.status,
    now
  });
  const ingestionDataSource = createIngestionDataSource(input.latestBatchRun);

  const targets = activeInstruments.map((instrument) => {
    const holding = holdingByInstrumentId.get(instrument.id) ?? null;
    const watchlistItem = watchlistByInstrumentId.get(instrument.id) ?? null;
    const role = resolveTargetRole(Boolean(holding), Boolean(watchlistItem));
    const points = marketDataByInstrumentId.get(instrument.id) ?? [];
    const keyLevels = keyLevelsByInstrumentId.get(instrument.id) ?? [];

    return createTargetSnapshot({
      dataFreshness,
      holding,
      ingestionDataSource,
      keyLevels,
      macro,
      macroDataSource,
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
  const opportunity = createOpportunitySummary({
    dataFreshness,
    macro,
    status,
    targets
  });

  return {
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
    opportunity: createEmptyOpportunitySummary({
      basisDate: null,
      evaluatedTargetCount: 0,
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

function createOpportunitySummary({
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
  if (targets.length === 0) {
    return createEmptyOpportunitySummary({
      basisDate: null,
      evaluatedTargetCount: 0,
      reason: "尚未配置 active holdings 或 watchlist_items"
    });
  }

  if (status !== "ready") {
    return createEmptyOpportunitySummary({
      basisDate: dataFreshness.latestMarketDate ?? macro.basisDate,
      evaluatedTargetCount: targets.length,
      reason:
        status === "stale"
          ? "数据已过期，今日不输出机会"
          : "数据不足，今日不输出机会"
    });
  }

  const candidates = targets
    .map((target) => ({
      score: scoreOpportunityCandidate({ macro, target }),
      target
    }))
    .filter(
      (
        candidate
      ): candidate is { score: number; target: DashboardTargetSnapshot } =>
        candidate.score !== null
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightPriority = right.target.watchlistItem?.priority ?? 0;
      const leftPriority = left.target.watchlistItem?.priority ?? 0;

      if (rightPriority !== leftPriority) {
        return rightPriority - leftPriority;
      }

      return left.target.instrument.symbol.localeCompare(right.target.instrument.symbol);
    });
  const best = candidates[0] ?? null;

  if (!best || best.score < 65) {
    return createEmptyOpportunitySummary({
      basisDate: dataFreshness.latestMarketDate ?? macro.basisDate,
      evaluatedTargetCount: targets.length,
      reason: "没有标的同时满足关键价位、数据质量和宏观过滤"
    });
  }

  return {
    action: {
      ...best.target.action,
      label: `今日重点观察：${best.target.instrument.symbol} · ${best.target.action.label}`
    },
    candidate: best.target,
    evaluatedTargetCount: targets.length,
    score: best.score,
    status: "available"
  };
}

function createEmptyOpportunitySummary({
  basisDate,
  evaluatedTargetCount,
  reason
}: {
  basisDate: string | null;
  evaluatedTargetCount: number;
  reason: string;
}): DashboardOpportunitySummary {
  return {
    action: {
      basisDate,
      kind: "wait",
      label: "今日无高质量关注机会，保持观察。",
      reasons: [reason],
      risks: ["为满足交易冲动而展示次优机会，会降低信噪比"]
    },
    candidate: null,
    evaluatedTargetCount,
    score: null,
    status: "none"
  };
}

function scoreOpportunityCandidate({
  macro,
  target
}: {
  macro: DashboardSnapshot["macro"];
  target: DashboardTargetSnapshot;
}): number | null {
  if (target.action.dataQuality !== "complete") {
    return null;
  }

  if (
    target.action.kind !== "consider_small_add" &&
    target.action.kind !== "watch_key_level"
  ) {
    return null;
  }

  const nearestActionableLevel = target.keyLevels.find(
    (level) =>
      level.isNear &&
      ["long_term_add", "support", "watch"].includes(level.level.levelType)
  );

  if (!nearestActionableLevel) {
    return null;
  }

  if (
    macro.status === "elevated" &&
    macro.panicReboundMode.state !== "active" &&
    macro.panicReboundMode.state !== "watch"
  ) {
    return null;
  }

  const missingPenalty = target.action.evidence.missing.length * 8;
  const opposingPenalty = target.action.evidence.opposing.length * 6;
  const riskPenalty = target.action.evidence.risks.length * 4;
  const watchlistPriority = Math.min(target.watchlistItem?.priority ?? 0, 100) / 10;
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
  const distanceBonus = nearestActionableLevel.distancePercent <= 3 ? 12 : 6;
  const roleBonus = target.role !== "holding" ? 6 : 0;

  return Math.round(
    30 +
      actionBonus +
      distanceBonus +
      dropBonus +
      macroBonus +
      watchlistPriority +
      roleBonus -
      missingPenalty -
      opposingPenalty -
      riskPenalty
  );
}

function createTargetSnapshot({
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

  return {
    action: createTargetAction({
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
    }),
    changePercent,
    dataStatus,
    holding,
    instrument,
    keyLevels: keyLevelProximities,
    latestPrice: latest.close,
    latestPriceDate: latest.date,
    movingAverages,
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

function createTrustAction({
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

function createEmptyEvidence(): DashboardEvidenceGroups {
  return {
    missing: [],
    opposing: [],
    risks: [],
    supporting: []
  };
}

function createEvidenceItem(input: DashboardEvidenceItem): DashboardEvidenceItem {
  return input;
}

function createPriceDataSource({
  latest,
  status
}: {
  latest: DashboardMarketDataPoint | null;
  status: DashboardDataSourceSnapshot["status"];
}): DashboardDataSourceSnapshot {
  return {
    basisDate: latest?.date ?? null,
    detail: latest ? `收盘价 ${latest.close}` : "缺少收盘价",
    kind: "price",
    label: "价格",
    provider: latest ? formatProviderLabel(latest.provider) : null,
    source: "market_data_daily",
    status,
    updatedAt: latest?.updatedAt.toISOString() ?? null
  };
}

function createTechnicalDataSource({
  latest,
  pointCount,
  readyCount,
  status
}: {
  latest: DashboardMarketDataPoint | null;
  pointCount: number;
  readyCount: number;
  status: DashboardDataSourceSnapshot["status"];
}): DashboardDataSourceSnapshot {
  return {
    basisDate: latest?.date ?? null,
    detail: `均线 ready ${readyCount}/4，样本 ${pointCount} 日`,
    kind: "technical",
    label: "技术指标",
    provider: latest ? formatProviderLabel(latest.provider) : null,
    source: "market_data_daily",
    status,
    updatedAt: latest?.updatedAt.toISOString() ?? null
  };
}

function createMacroDataSource({
  macroObservations,
  macroStatus,
  now
}: {
  macroObservations: DashboardInputSnapshot["macroObservations"];
  macroStatus: DashboardSnapshot["macro"]["status"];
  now: Date;
}): DashboardDataSourceSnapshot {
  const latestObservations = ["VIXCLS", "DGS10"]
    .map((seriesId) =>
      macroObservations
        .filter((observation) => observation.seriesId === seriesId)
        .sort((left, right) => left.date.localeCompare(right.date))
        .at(-1)
    )
    .filter(
      (observation): observation is DashboardInputSnapshot["macroObservations"][number] =>
        Boolean(observation)
    );
  const latestDate = maxDate(latestObservations.map((observation) => observation.date));
  const latestUpdatedAt = maxIso(
    latestObservations.map((observation) => observation.updatedAt)
  );
  const providers = [
    ...new Set(latestObservations.map((observation) => observation.provider))
  ];
  const status =
    latestObservations.length === 0
      ? "unavailable"
      : latestDate && isDateStale(latestDate, now.toISOString())
        ? "stale"
        : macroStatus === "insufficient"
          ? "partial"
          : "ready";

  return {
    basisDate: latestDate,
    detail:
      latestObservations.length > 0
        ? latestObservations
            .map((observation) => `${observation.seriesId} ${observation.date}`)
            .join(" · ")
        : "缺少 VIX / DGS10",
    kind: "macro",
    label: "宏观",
    provider: providers.length > 0 ? providers.map(formatProviderLabel).join(" / ") : null,
    source: "macro_observations",
    status,
    updatedAt: latestUpdatedAt
  };
}

function createConfigurationDataSource({
  holding,
  keyLevels,
  watchlistItem
}: {
  holding: DashboardTargetSnapshot["holding"];
  keyLevels: DashboardKeyPriceLevelInput[];
  watchlistItem: DashboardTargetSnapshot["watchlistItem"];
}): DashboardDataSourceSnapshot {
  const updatedAt = maxIso([
    holding?.updatedAt ?? null,
    watchlistItem?.updatedAt ?? null,
    ...keyLevels.map((level) => level.updatedAt)
  ]);
  const source = holding ? "holdings" : "watchlist_items";
  const detailParts = [
    holding ? `持仓 ${holding.positionSize}` : null,
    watchlistItem ? `关注优先级 ${watchlistItem.priority}` : null,
    `${keyLevels.length} 个关键价位`
  ].filter((part): part is string => Boolean(part));

  return {
    basisDate: null,
    detail: detailParts.join(" · "),
    kind: "configuration",
    label: "配置",
    provider: null,
    source,
    status: keyLevels.length > 0 ? "ready" : "partial",
    updatedAt
  };
}

function createIngestionDataSource(
  latestBatchRun: DashboardInputSnapshot["latestBatchRun"]
): DashboardDataSourceSnapshot | null {
  if (!latestBatchRun) {
    return null;
  }

  return {
    basisDate: null,
    detail: formatRunSummary(latestBatchRun.summary),
    kind: "ingestion",
    label: "最近刷新",
    provider: "Manual",
    source: "ingestion_runs",
    status:
      latestBatchRun.status === "success"
        ? "ready"
        : latestBatchRun.status === "partial_success"
          ? "partial"
          : latestBatchRun.status === "failed"
            ? "unavailable"
            : "partial",
    updatedAt: latestBatchRun.finishedAt?.toISOString() ?? latestBatchRun.startedAt.toISOString()
  };
}

function formatRunSummary(summary: Record<string, unknown>) {
  const allowedKeys = [
    "totalTargets",
    "successfulTargets",
    "failedTargets",
    "pointsWritten"
  ];
  const parts = allowedKeys
    .map((key) => {
      const value = summary[key];
      return typeof value === "number" ? `${key} ${value}` : null;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : "无安全摘要";
}

function formatProviderLabel(provider: string) {
  const labels: Record<string, string> = {
    coingecko: "CoinGecko",
    fake: "Fake",
    fmp: "FMP",
    fred: "FRED",
    manual: "Manual"
  };

  return labels[provider] ?? provider;
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

function createSummaryDataSources(
  snapshot: DashboardSnapshot
): DashboardDataSourceSnapshot[] {
  return [
    {
      basisDate: snapshot.dataFreshness.latestMarketDate,
      detail: snapshot.dataFreshness.latestMarketDate
        ? "Dashboard normalized market data"
        : "缺少 market_data_daily",
      kind: "price",
      label: "市场数据",
      provider: null,
      source: "market_data_daily",
      status:
        snapshot.status === "unavailable"
          ? "unavailable"
          : snapshot.status === "stale"
            ? "stale"
            : "ready",
      updatedAt: null
    },
    {
      basisDate: snapshot.dataFreshness.latestMacroDate,
      detail: snapshot.dataFreshness.latestMacroDate
        ? "Dashboard normalized macro observations"
        : "缺少 macro_observations",
      kind: "macro",
      label: "宏观数据",
      provider: null,
      source: "macro_observations",
      status: snapshot.dataFreshness.latestMacroDate ? "ready" : "unavailable",
      updatedAt: null
    },
    {
      basisDate: null,
      detail: snapshot.dataFreshness.latestRefreshStatus ?? "暂无刷新记录",
      kind: "ingestion",
      label: "最近刷新",
      provider: "Manual",
      source: "ingestion_runs",
      status: snapshot.dataFreshness.latestRefreshStatus
        ? snapshot.dataFreshness.latestRefreshStatus === "success"
          ? "ready"
          : "partial"
        : "unavailable",
      updatedAt: snapshot.dataFreshness.latestRefreshStartedAt
    }
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

function maxIso(dates: Array<Date | null>) {
  return dates
    .filter((date): date is Date => date instanceof Date)
    .map((date) => date.toISOString())
    .sort()
    .at(-1) ?? null;
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
