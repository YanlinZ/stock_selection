import type {
  AssetType,
  HoldingType,
  KeyPriceLevelType,
  PositionSize
} from "@/server/config/types";
import type { DataRefreshTargetKind, IngestionStatus } from "@/server/ingestion/types";

export type DashboardStatus = "ready" | "stale" | "unavailable";

export type DashboardInstrument = {
  assetType: AssetType;
  currency: string;
  exchange: string | null;
  id: string;
  name: string | null;
  symbol: string;
};

export type DashboardHoldingInput = {
  costBasis: number | null;
  holdingType: HoldingType;
  id: string;
  instrument: DashboardInstrument;
  notes: string | null;
  positionSize: PositionSize;
};

export type DashboardWatchlistInput = {
  id: string;
  instrument: DashboardInstrument;
  notes: string | null;
  priority: number;
  theme: string | null;
};

export type DashboardKeyPriceLevelInput = {
  currency: string;
  id: string;
  instrument: DashboardInstrument;
  levelType: KeyPriceLevelType;
  notes: string | null;
  price: number;
};

export type DashboardMarketDataPoint = {
  adjustedClose: number | null;
  close: number;
  date: string;
  high: number | null;
  instrumentId: string;
  low: number | null;
  open: number | null;
  provider: string;
  volume: number | null;
};

export type DashboardMacroObservation = {
  date: string;
  provider: string;
  seriesId: string;
  unit: string | null;
  value: number;
};

export type DashboardRunSnapshot = {
  errorMessage: string | null;
  finishedAt: Date | null;
  id: string;
  startedAt: Date;
  status: IngestionStatus;
  summary: Record<string, unknown>;
  targetKind: DataRefreshTargetKind;
  targetSymbol: string | null;
};

export type DashboardInputSnapshot = {
  holdings: DashboardHoldingInput[];
  keyPriceLevels: DashboardKeyPriceLevelInput[];
  latestBatchRun: DashboardRunSnapshot | null;
  macroObservations: DashboardMacroObservation[];
  marketData: DashboardMarketDataPoint[];
  watchlistItems: DashboardWatchlistInput[];
};

export type IndicatorValue = {
  message: string | null;
  status: "ready" | "unavailable";
  value: number | null;
};

export type MovingAverageWindow = 8 | 21 | 50 | 200;

export type MovingAverageSnapshot = Record<MovingAverageWindow, IndicatorValue>;

export type RecentRangeSnapshot = {
  high: number | null;
  highDate: string | null;
  lookbackDays: number;
  low: number | null;
  lowDate: string | null;
  status: "ready" | "unavailable";
};

export type VolumeChangeSnapshot = {
  averageVolume: number | null;
  latestVolume: number | null;
  message: string | null;
  percent: number | null;
  status: "ready" | "unavailable";
};

export type KeyLevelProximitySnapshot = {
  distancePercent: number;
  distanceText: string;
  isNear: boolean;
  level: DashboardKeyPriceLevelInput;
  state: "below" | "near" | "above";
  thresholdPercent: number;
};

export type DashboardActionKind =
  | "consider_small_add"
  | "observe"
  | "refresh_data"
  | "risk_control"
  | "wait"
  | "watch_key_level";

export type DashboardActionRecommendation = {
  basisDate: string | null;
  kind: DashboardActionKind;
  label: string;
  reasons: string[];
  risks: string[];
};

export type DashboardTargetRole = "holding" | "watchlist" | "both";

export type DashboardTargetSnapshot = {
  action: DashboardActionRecommendation;
  changePercent: number | null;
  dataStatus: DashboardStatus;
  holding: DashboardHoldingInput | null;
  instrument: DashboardInstrument;
  keyLevels: KeyLevelProximitySnapshot[];
  latestPrice: number | null;
  latestPriceDate: string | null;
  movingAverages: MovingAverageSnapshot;
  recentRange: RecentRangeSnapshot;
  role: DashboardTargetRole;
  volumeChange: VolumeChangeSnapshot;
  watchlistItem: DashboardWatchlistInput | null;
};

export type MacroScoreStatus =
  | "calm"
  | "elevated"
  | "insufficient"
  | "panic_watch";

export type PanicReboundMode = {
  basisDate: string | null;
  label: string;
  reasons: string[];
  risks: string[];
  state: "active" | "off" | "watch";
};

export type MacroObservationSnapshot = {
  date: string;
  label: string;
  seriesId: string;
  unit: string | null;
  value: number;
};

export type MacroScoreSnapshot = {
  action: DashboardActionRecommendation;
  basisDate: string | null;
  observations: MacroObservationSnapshot[];
  panicReboundMode: PanicReboundMode;
  reboundOpportunityScore: number | null;
  reboundReasons: string[];
  riskReasons: string[];
  marketRiskScore: number | null;
  status: MacroScoreStatus;
};

export type DashboardDataFreshness = {
  generatedAt: string;
  isStale: boolean;
  latestMacroDate: string | null;
  latestMarketDate: string | null;
  latestRefreshStartedAt: string | null;
  latestRefreshStatus: IngestionStatus | null;
  warnings: string[];
};

export type DashboardSnapshot = {
  dataFreshness: DashboardDataFreshness;
  generatedAt: string;
  holdings: DashboardTargetSnapshot[];
  keyLevelAlerts: KeyLevelProximitySnapshot[];
  macro: MacroScoreSnapshot;
  status: DashboardStatus;
  summary: DashboardActionRecommendation;
  targets: DashboardTargetSnapshot[];
  watchlistItems: DashboardTargetSnapshot[];
};
