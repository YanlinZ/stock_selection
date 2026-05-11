import {
  createProviderRequest,
  createRawResponse,
  normalizeCurrency,
  normalizeSeriesId,
  normalizeSymbol
} from "./shared";
import type {
  DailyMarketDataPoint,
  DailyMarketDataProvider,
  DailyMarketDataRequest,
  MacroObservationPoint,
  MacroObservationProvider,
  MacroObservationRequest,
  ProviderDataResponse
} from "./types";

export type FakeProviderFixtures = {
  macroObservations?: Record<string, MacroObservationPoint[]>;
  marketData?: Record<string, DailyMarketDataPoint[]>;
};

export function createFakeProvider(
  fixtures: FakeProviderFixtures = {}
): DailyMarketDataProvider & MacroObservationProvider {
  return {
    provider: "fake",

    async getDailyPrices(input) {
      return createFakeDailyMarketDataResponse(input, fixtures.marketData);
    },

    async getMacroObservations(input) {
      return createFakeMacroObservationResponse(input, fixtures.macroObservations);
    }
  };
}

function createFakeDailyMarketDataResponse(
  input: DailyMarketDataRequest,
  marketData: Record<string, DailyMarketDataPoint[]> = {}
): ProviderDataResponse<DailyMarketDataPoint> {
  const symbol = normalizeSymbol(input.symbol);
  const currency = normalizeCurrency(input.currency);
  const request = createProviderRequest({
    endpoint: "fake/daily-prices",
    params: {
      currency,
      endDate: input.endDate ?? null,
      startDate: input.startDate ?? null,
      symbol
    },
    provider: "fake",
    requestKey: `fake:daily-prices:${symbol}`,
    targetKind: "daily_market_data",
    targetSymbol: symbol
  });
  const points = filterByDateRange(marketData[symbol] ?? [], input).map((point) => ({
    ...point,
    currency,
    sourceProvider: "fake" as const,
    symbol
  }));

  return {
    points,
    rawResponse: createRawResponse({
      payload: points,
      request
    }),
    request
  };
}

function createFakeMacroObservationResponse(
  input: MacroObservationRequest,
  macroObservations: Record<string, MacroObservationPoint[]> = {}
): ProviderDataResponse<MacroObservationPoint> {
  const seriesId = normalizeSeriesId(input.seriesId);
  const request = createProviderRequest({
    endpoint: "fake/macro-observations",
    params: {
      endDate: input.endDate ?? null,
      seriesId,
      startDate: input.startDate ?? null,
      unit: input.unit ?? null
    },
    provider: "fake",
    requestKey: `fake:macro-observations:${seriesId}`,
    targetKind: "macro_observation",
    targetSymbol: seriesId
  });
  const points = filterByDateRange(macroObservations[seriesId] ?? [], input).map(
    (point) => ({
      ...point,
      seriesId,
      sourceProvider: "fake" as const,
      unit: input.unit ?? point.unit
    })
  );

  return {
    points,
    rawResponse: createRawResponse({
      payload: points,
      request
    }),
    request
  };
}

function filterByDateRange<TPoint extends { date: string }>(
  points: TPoint[],
  input: { endDate?: string; startDate?: string }
) {
  return points.filter((point) => {
    if (input.startDate && point.date < input.startDate) {
      return false;
    }

    if (input.endDate && point.date > input.endDate) {
      return false;
    }

    return true;
  });
}
