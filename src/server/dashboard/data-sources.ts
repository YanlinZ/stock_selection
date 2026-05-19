import { isDateStale, maxDate, maxIso } from "./shared";
import type {
  DashboardDataFreshness,
  DashboardDataSourceSnapshot,
  DashboardInputSnapshot,
  DashboardKeyPriceLevelInput,
  DashboardMarketDataPoint,
  DashboardSnapshot,
  DashboardStatus,
  DashboardTargetSnapshot
} from "./types";

export function createPriceDataSource({
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

export function createTechnicalDataSource({
  latest,
  pointCount,
  recentRangeStatus,
  readyCount,
  status,
  volumeStatus
}: {
  latest: DashboardMarketDataPoint | null;
  pointCount: number;
  recentRangeStatus: "ready" | "unavailable";
  readyCount: number;
  status: DashboardDataSourceSnapshot["status"];
  volumeStatus: "ready" | "unavailable";
}): DashboardDataSourceSnapshot {
  return {
    basisDate: latest?.date ?? null,
    detail: `均线 ready ${readyCount}/4，近高/近低 ${formatTechnicalPartStatus(recentRangeStatus)}，成交量 ${formatTechnicalPartStatus(volumeStatus)}，样本 ${pointCount} 日`,
    kind: "technical",
    label: "技术指标",
    provider: latest ? formatProviderLabel(latest.provider) : null,
    source: "market_data_daily",
    status,
    updatedAt: latest?.updatedAt.toISOString() ?? null
  };
}

export function createDashboardDataSources({
  dataFreshness,
  latestBatchRun,
  macroObservations,
  macroStatus,
  now,
  status
}: {
  dataFreshness: DashboardDataFreshness;
  latestBatchRun: DashboardInputSnapshot["latestBatchRun"];
  macroObservations: DashboardInputSnapshot["macroObservations"];
  macroStatus: DashboardSnapshot["macro"]["status"];
  now: Date;
  status: DashboardStatus;
}): DashboardDataSourceSnapshot[] {
  return [
    {
      basisDate: dataFreshness.latestMarketDate,
      detail: dataFreshness.latestMarketDate
        ? "Dashboard normalized market data"
        : "缺少 market_data_daily",
      kind: "price",
      label: "市场数据",
      provider: null,
      source: "market_data_daily",
      status:
        status === "unavailable"
          ? "unavailable"
          : status === "stale"
            ? "stale"
            : "ready",
      updatedAt: null
    },
    createMacroDataSource({
      macroObservations,
      macroStatus,
      now
    }),
    createIngestionDataSource(latestBatchRun) ?? {
      basisDate: null,
      detail: "暂无刷新记录",
      kind: "ingestion",
      label: "最近刷新",
      provider: "Manual",
      source: "ingestion_runs",
      status: "unavailable",
      updatedAt: null
    }
  ];
}

export function createMacroDataSource({
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

export function createConfigurationDataSource({
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

export function createIngestionDataSource(
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

export function createOpportunityDataSources({
  dataFreshness,
  status
}: {
  dataFreshness: DashboardDataFreshness;
  status: DashboardStatus;
}): DashboardDataSourceSnapshot[] {
  return [
    {
      basisDate: dataFreshness.latestMarketDate,
      detail: dataFreshness.latestMarketDate
        ? "Dashboard normalized market data"
        : "缺少 market_data_daily",
      kind: "price",
      label: "市场数据",
      provider: null,
      source: "market_data_daily",
      status:
        status === "unavailable"
          ? "unavailable"
          : status === "stale"
            ? "stale"
            : "ready",
      updatedAt: null
    },
    {
      basisDate: dataFreshness.latestMacroDate,
      detail: dataFreshness.latestMacroDate
        ? "Dashboard normalized macro observations"
        : "缺少 macro_observations",
      kind: "macro",
      label: "宏观数据",
      provider: null,
      source: "macro_observations",
      status:
        status === "stale"
          ? "stale"
          : dataFreshness.latestMacroDate
            ? "ready"
            : "unavailable",
      updatedAt: null
    },
    {
      basisDate: null,
      detail: dataFreshness.latestRefreshStatus ?? "暂无刷新记录",
      kind: "ingestion",
      label: "最近刷新",
      provider: "Manual",
      source: "ingestion_runs",
      status: dataFreshness.latestRefreshStatus
        ? dataFreshness.latestRefreshStatus === "success"
          ? "ready"
          : "partial"
        : "unavailable",
      updatedAt: dataFreshness.latestRefreshStartedAt
    }
  ];
}

export function createSummaryDataSources(
  snapshot: DashboardSnapshot
): DashboardDataSourceSnapshot[] {
  return snapshot.dataSources;
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

function formatTechnicalPartStatus(status: "ready" | "unavailable") {
  return status === "ready" ? "ready" : "unavailable";
}
