import type { InferSelectModel } from "drizzle-orm";

import {
  ingestionRuns,
  macroObservations,
  marketDataDaily,
  providerRawResponses
} from "@/db/schema";
import type { AssetType } from "@/server/config/types";
import type {
  DailyMarketDataPoint,
  ExternalProviderName,
  MacroObservationPoint,
  ProviderName,
  ProviderRawResponse,
  ProviderTargetKind
} from "@/server/providers";

export type IngestionRunRecord = InferSelectModel<typeof ingestionRuns>;
export type ProviderRawResponseRecord = InferSelectModel<
  typeof providerRawResponses
>;
export type MarketDataDailyRecord = InferSelectModel<typeof marketDataDaily>;
export type MacroObservationRecord = InferSelectModel<typeof macroObservations>;

export type IngestionStatus = IngestionRunRecord["status"];
export type IngestionRunProvider = ProviderName | "manual";
export type DataRefreshTargetKind = ProviderTargetKind | "refresh_all";

export type MarketDataIngestionTarget = {
  assetType: AssetType;
  currency: string;
  instrumentId: string;
  provider: "fmp" | "coingecko";
  providerMetadata: Record<string, unknown>;
  symbol: string;
};

export type MacroObservationIngestionTarget = {
  provider: "fred";
  seriesId: string;
  unit: string | null;
};

export type IngestionRefreshPlan = {
  macroObservations: MacroObservationIngestionTarget[];
  marketData: MarketDataIngestionTarget[];
};

export type CreateIngestionRunInput = {
  provider: IngestionRunProvider;
  requestedBy: string;
  startedAt?: Date;
  targetKind: DataRefreshTargetKind;
  targetSymbol: string | null;
};

export type FinishIngestionRunInput = {
  errorMessage?: string | null;
  finishedAt?: Date;
  id: string;
  status: IngestionStatus;
  summary: Record<string, unknown>;
};

export type SaveRawResponseInput = {
  ingestionRunId: string;
  rawResponse: ProviderRawResponse;
};

export type UpsertMarketDataPointsInput = {
  ingestionRunId: string;
  instrumentId: string;
  points: DailyMarketDataPoint[];
  rawResponseId: string;
};

export type UpsertMacroObservationPointsInput = {
  ingestionRunId: string;
  points: MacroObservationPoint[];
  rawResponseId: string;
};

export type RefreshTargetResult = {
  errorMessage: string | null;
  pointsReceived: number;
  pointsWritten: number;
  provider: ExternalProviderName;
  rawResponseId: string | null;
  runId: string;
  status: IngestionStatus;
  targetKind: ProviderTargetKind;
  targetSymbol: string | null;
};

export type RefreshAllResult = {
  batchRunId: string;
  results: RefreshTargetResult[];
  status: IngestionStatus;
  summary: RefreshSummary;
};

export type RefreshFailedTargetDetail = {
  errorMessage: string;
  provider: ExternalProviderName;
  targetKind: ProviderTargetKind;
  targetSymbol: string | null;
};

export type RefreshSummary = {
  failedTargetDetails: RefreshFailedTargetDetail[];
  failedTargets: number;
  macroTargets: number;
  marketTargets: number;
  pointsReceived: number;
  pointsWritten: number;
  successfulTargets: number;
  totalTargets: number;
};

export type DataProviderState =
  | "idle"
  | "running"
  | "ok"
  | "empty"
  | "stale"
  | "error";

export type DataStatusProviderSnapshot = {
  errorMessage: string | null;
  latestDataDate: string | null;
  latestFetchedAt: string | null;
  latestRun: Pick<
    IngestionRunRecord,
    | "errorMessage"
    | "finishedAt"
    | "id"
    | "startedAt"
    | "status"
    | "summary"
    | "targetKind"
    | "targetSymbol"
  > | null;
  provider: ExternalProviderName;
  rowCount: number;
  state: DataProviderState;
};

export type DataStatusSnapshot = {
  batchRun: Pick<
    IngestionRunRecord,
    | "errorMessage"
    | "finishedAt"
    | "id"
    | "startedAt"
    | "status"
    | "summary"
    | "targetKind"
    | "targetSymbol"
  > | null;
  generatedAt: string;
  providers: DataStatusProviderSnapshot[];
};
