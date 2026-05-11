export const externalProviderNames = ["fmp", "coingecko", "fred"] as const;
export const providerNames = [...externalProviderNames, "fake"] as const;

export type ExternalProviderName = (typeof externalProviderNames)[number];
export type ProviderName = (typeof providerNames)[number];

export type ProviderRequestParams = Record<
  string,
  boolean | number | string | null
>;

export type ProviderTargetKind = "daily_market_data" | "macro_observation";

export type ProviderRequestDescriptor = {
  provider: ProviderName;
  endpoint: string;
  requestKey: string;
  params: ProviderRequestParams;
  targetKind: ProviderTargetKind;
  targetSymbol: string | null;
};

export type ProviderRawResponse<TPayload = unknown> = {
  request: ProviderRequestDescriptor;
  responseStatus: number | null;
  payload: TPayload | null;
  errorMessage: string | null;
  fetchedAt: string;
};

export type ProviderDataResponse<TPoint, TPayload = unknown> = {
  request: ProviderRequestDescriptor;
  rawResponse: ProviderRawResponse<TPayload>;
  points: TPoint[];
};

export type DailyMarketDataPoint = {
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjustedClose: number | null;
  volume: number | null;
  currency: string;
  sourceProvider: ProviderName;
};

export type MacroObservationPoint = {
  seriesId: string;
  date: string;
  value: number;
  unit: string | null;
  sourceProvider: ProviderName;
};

export type DailyMarketDataRequest = {
  symbol: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
};

export type MacroObservationRequest = {
  seriesId: string;
  startDate?: string;
  endDate?: string;
  unit?: string;
};

export type DailyMarketDataProvider = {
  provider: ProviderName;
  getDailyPrices(
    input: DailyMarketDataRequest
  ): Promise<ProviderDataResponse<DailyMarketDataPoint>>;
};

export type MacroObservationProvider = {
  provider: ProviderName;
  getMacroObservations(
    input: MacroObservationRequest
  ): Promise<ProviderDataResponse<MacroObservationPoint>>;
};
