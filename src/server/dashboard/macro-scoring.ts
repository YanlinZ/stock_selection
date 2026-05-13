import {
  calculateDailyChangePercent,
  getLatestMarketPoint,
  roundPercent
} from "./indicators";
import type {
  DashboardActionRecommendation,
  DashboardMacroObservation,
  DashboardMarketDataPoint,
  MacroObservationSnapshot,
  MacroScoreSnapshot
} from "./types";

export type MacroMarketSeries = {
  points: DashboardMarketDataPoint[];
  symbol: string;
};

const macroObservationLabels: Record<string, string> = {
  DGS10: "10Y 美债收益率",
  VIXCLS: "VIX"
};

export function scoreMacroEnvironment({
  macroObservations,
  marketSeries
}: {
  macroObservations: DashboardMacroObservation[];
  marketSeries: MacroMarketSeries[];
}): MacroScoreSnapshot {
  const observations = createObservationSnapshots(macroObservations);
  const latestVix = getLatestObservation(macroObservations, "VIXCLS");
  const latestTenYearYield = getLatestObservation(macroObservations, "DGS10");
  const marketChanges = marketSeries
    .map((series) => ({
      basisDate: getLatestMarketPoint(series.points)?.date ?? null,
      changePercent: calculateDailyChangePercent(series.points),
      symbol: series.symbol
    }))
    .filter((series) => series.basisDate && series.changePercent !== null);

  if (!latestVix && !latestTenYearYield && marketChanges.length === 0) {
    return createInsufficientMacroSnapshot();
  }

  const riskReasons: string[] = [];
  const reboundReasons: string[] = [];
  let riskScore = 10;
  let reboundOpportunityScore = 5;

  if (latestVix) {
    if (latestVix.value > 35) {
      riskScore += 50;
      reboundOpportunityScore += 35;
      riskReasons.push(`VIX ${formatNumber(latestVix.value)}，恐慌显著升温`);
      reboundReasons.push("VIX 高于 35，可能接近恐慌释放区");
    } else if (latestVix.value > 25) {
      riskScore += 35;
      reboundOpportunityScore += 25;
      riskReasons.push(`VIX ${formatNumber(latestVix.value)}，市场风险抬升`);
      reboundReasons.push("VIX 高于 25，进入反弹观察阈值");
    } else if (latestVix.value > 18) {
      riskScore += 15;
      reboundOpportunityScore += 5;
      riskReasons.push(`VIX ${formatNumber(latestVix.value)}，波动略高`);
    } else {
      riskReasons.push(`VIX ${formatNumber(latestVix.value)}，恐慌不明显`);
    }
  }

  if (latestTenYearYield) {
    if (latestTenYearYield.value >= 4.5) {
      riskScore += 15;
      riskReasons.push(
        `10Y 美债收益率 ${formatNumber(latestTenYearYield.value)}%，压制风险资产估值`
      );
    } else {
      riskReasons.push(
        `10Y 美债收益率 ${formatNumber(latestTenYearYield.value)}%，利率压力可控`
      );
    }
  }

  const broadMarketDrops = marketChanges.filter(
    (series) =>
      ["SPY", "QQQ"].includes(series.symbol) &&
      series.changePercent !== null &&
      series.changePercent <= -1.5
  );
  const riskAssetDrops = marketChanges.filter(
    (series) =>
      ["BTC", "ETH"].includes(series.symbol) &&
      series.changePercent !== null &&
      series.changePercent <= -5
  );

  for (const drop of broadMarketDrops) {
    const change = formatSignedPercent(drop.changePercent ?? 0);
    riskScore += 12;
    reboundOpportunityScore += 10;
    riskReasons.push(`${drop.symbol} 日跌幅 ${change}，大盘承压`);
    reboundReasons.push(`${drop.symbol} 出现明显回撤，可观察止跌质量`);
  }

  for (const drop of riskAssetDrops) {
    const change = formatSignedPercent(drop.changePercent ?? 0);
    riskScore += 8;
    reboundOpportunityScore += 6;
    riskReasons.push(`${drop.symbol} 日跌幅 ${change}，风险偏好走弱`);
  }

  const cappedRiskScore = clampScore(riskScore);
  const cappedReboundOpportunityScore = clampScore(reboundOpportunityScore);
  const panicReboundMode = createPanicReboundMode({
    broadMarketDrops,
    basisDate: resolveLatestDate([
      latestVix?.date ?? null,
      ...marketChanges.map((series) => series.basisDate)
    ]),
    latestVix,
    reboundReasons
  });
  const status =
    panicReboundMode.state !== "off"
      ? "panic_watch"
      : cappedRiskScore >= 45
        ? "elevated"
        : "calm";

  return {
    action: createMacroAction({
      basisDate: resolveLatestDate([
        latestVix?.date ?? null,
        latestTenYearYield?.date ?? null,
        ...marketChanges.map((series) => series.basisDate)
      ]),
      reboundOpportunityScore: cappedReboundOpportunityScore,
      riskScore: cappedRiskScore,
      status
    }),
    basisDate: resolveLatestDate([
      latestVix?.date ?? null,
      latestTenYearYield?.date ?? null,
      ...marketChanges.map((series) => series.basisDate)
    ]),
    marketRiskScore: cappedRiskScore,
    observations,
    panicReboundMode,
    reboundOpportunityScore: cappedReboundOpportunityScore,
    reboundReasons:
      reboundReasons.length > 0 ? reboundReasons : ["宏观反弹信号不明显"],
    riskReasons,
    status
  };
}

function createObservationSnapshots(
  macroObservations: DashboardMacroObservation[]
): MacroObservationSnapshot[] {
  return ["VIXCLS", "DGS10"]
    .map((seriesId) => getLatestObservation(macroObservations, seriesId))
    .filter(
      (observation): observation is DashboardMacroObservation =>
        observation !== null
    )
    .map((observation) => ({
      date: observation.date,
      label: macroObservationLabels[observation.seriesId] ?? observation.seriesId,
      seriesId: observation.seriesId,
      unit: observation.unit,
      value: observation.value
    }));
}

function getLatestObservation(
  observations: DashboardMacroObservation[],
  seriesId: string
) {
  return (
    observations
      .filter((observation) => observation.seriesId === seriesId)
      .sort((left, right) => left.date.localeCompare(right.date))
      .at(-1) ?? null
  );
}

function createPanicReboundMode({
  basisDate,
  broadMarketDrops,
  latestVix,
  reboundReasons
}: {
  basisDate: string | null;
  broadMarketDrops: Array<{ symbol: string }>;
  latestVix: DashboardMacroObservation | null;
  reboundReasons: string[];
}) {
  if (!latestVix || latestVix.value <= 25) {
    return {
      basisDate,
      label: "未进入恐慌反弹模式",
      reasons: latestVix
        ? [`VIX ${formatNumber(latestVix.value)}，未超过 25`]
        : ["VIX 数据不足"],
      risks: ["仍需观察大盘是否破位或风险资产同步走弱"],
      state: "off" as const
    };
  }

  if (broadMarketDrops.length > 0) {
    return {
      basisDate,
      label: "恐慌反弹观察模式开启",
      reasons: [
        `VIX ${formatNumber(latestVix.value)} 高于 25`,
        ...reboundReasons.slice(0, 2)
      ],
      risks: ["大盘继续破位时，反弹尝试容易失败"],
      state: "active" as const
    };
  }

  return {
    basisDate,
    label: "恐慌反弹预警",
    reasons: [`VIX ${formatNumber(latestVix.value)} 高于 25`],
    risks: ["缺少 SPY/QQQ 明显下跌确认，暂不升级为行动信号"],
    state: "watch" as const
  };
}

function createMacroAction({
  basisDate,
  reboundOpportunityScore,
  riskScore,
  status
}: {
  basisDate: string | null;
  reboundOpportunityScore: number;
  riskScore: number;
  status: "calm" | "elevated" | "panic_watch";
}): DashboardActionRecommendation {
  if (status === "panic_watch") {
    return {
      basisDate,
      kind: "watch_key_level",
      label: "观察恐慌反弹，不追高",
      reasons: [
        `市场风险评分 ${riskScore}/100`,
        `反弹机会评分 ${reboundOpportunityScore}/100`
      ],
      risks: ["恐慌延续会让分批试探过早，必须等关键价位或止跌确认"]
    };
  }

  if (status === "elevated") {
    return {
      basisDate,
      kind: "observe",
      label: "风险偏高，以观察为主",
      reasons: [`市场风险评分 ${riskScore}/100`],
      risks: ["风险未释放前，次优机会不应强行交易"]
    };
  }

  return {
    basisDate,
    kind: "wait",
    label: "宏观环境平稳，等待更好的价格",
    reasons: [`市场风险评分 ${riskScore}/100`],
    risks: ["平稳环境下追高的赔率有限"]
  };
}

function createInsufficientMacroSnapshot(): MacroScoreSnapshot {
  return {
    action: {
      basisDate: null,
      kind: "refresh_data",
      label: "宏观信息不足，先刷新数据",
      reasons: ["normalized macro_observations 与可用市场数据不足"],
      risks: ["信息不足时不输出宏观交易建议"]
    },
    basisDate: null,
    marketRiskScore: null,
    observations: [],
    panicReboundMode: {
      basisDate: null,
      label: "信息不足",
      reasons: ["缺少 VIX 或大盘数据"],
      risks: ["无法判断恐慌是否已经释放"],
      state: "off"
    },
    reboundOpportunityScore: null,
    reboundReasons: ["宏观数据不足"],
    riskReasons: ["宏观数据不足"],
    status: "insufficient"
  };
}

function resolveLatestDate(dates: Array<string | null>) {
  return dates
    .filter((date): date is string => typeof date === "string")
    .sort()
    .at(-1) ?? null;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function formatNumber(value: number) {
  return roundPercent(value).toFixed(1);
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${roundPercent(value).toFixed(1)}%`;
}
