import { z } from "zod";

import { toProviderContractError } from "./errors";
import {
  apiNumberSchema,
  createProviderFailure,
  createProviderRequest,
  createRawResponse,
  normalizeCurrency,
  normalizeSymbol,
  toUtcDateString
} from "./shared";
import type { DailyMarketDataPoint, ProviderDataResponse } from "./types";

const COINGECKO_MARKET_CHART_ENDPOINT = "/api/v3/coins/{id}/market_chart";

const coingeckoTimeSeriesTupleSchema = z.tuple([
  apiNumberSchema,
  apiNumberSchema
]);

const coingeckoMarketChartPayloadSchema = z.object({
  market_caps: z.array(coingeckoTimeSeriesTupleSchema).optional().default([]),
  prices: z.array(coingeckoTimeSeriesTupleSchema),
  total_volumes: z.array(coingeckoTimeSeriesTupleSchema).optional().default([])
});

export type CoinGeckoMarketChartPayload = z.input<
  typeof coingeckoMarketChartPayloadSchema
>;

export function createCoinGeckoMarketChartResponse(input: {
  coinId: string;
  currency?: string;
  days?: number | string;
  fetchedAt?: string;
  interval?: "daily" | "hourly";
  payload: unknown;
  responseStatus?: number | null;
  symbol: string;
}): ProviderDataResponse<DailyMarketDataPoint, CoinGeckoMarketChartPayload> {
  const request = createCoinGeckoMarketChartRequest(input);
  const symbol = request.targetSymbol ?? normalizeSymbol(input.symbol);
  const currency = normalizeCurrency(input.currency);

  try {
    const payload = coingeckoMarketChartPayloadSchema.parse(input.payload);
    const volumesByTimestamp = new Map(payload.total_volumes);
    const pointsByDate = new Map<string, DailyMarketDataPoint>();

    for (const [timestampMs, close] of payload.prices) {
      const date = toUtcDateString(timestampMs);
      pointsByDate.set(date, {
        adjustedClose: null,
        close,
        currency,
        date,
        high: null,
        low: null,
        open: null,
        sourceProvider: "coingecko",
        symbol,
        volume: volumesByTimestamp.get(timestampMs) ?? null
      });
    }

    return {
      points: [...pointsByDate.values()].sort((left, right) =>
        left.date.localeCompare(right.date)
      ),
      rawResponse: createRawResponse({
        fetchedAt: input.fetchedAt,
        payload,
        request,
        responseStatus: input.responseStatus
      }),
      request
    };
  } catch (error) {
    throw toProviderContractError({
      endpoint: COINGECKO_MARKET_CHART_ENDPOINT,
      error,
      provider: "coingecko"
    });
  }
}

export function createCoinGeckoMarketChartFailure(input: {
  coinId: string;
  currency?: string;
  days?: number | string;
  errorMessage: string;
  fetchedAt?: string;
  interval?: "daily" | "hourly";
  responseStatus?: number | null;
  symbol: string;
}) {
  return createProviderFailure<DailyMarketDataPoint>({
    errorMessage: input.errorMessage,
    fetchedAt: input.fetchedAt,
    request: createCoinGeckoMarketChartRequest(input),
    responseStatus: input.responseStatus
  });
}

function createCoinGeckoMarketChartRequest(input: {
  coinId: string;
  currency?: string;
  days?: number | string;
  interval?: "daily" | "hourly";
  symbol: string;
}) {
  const symbol = normalizeSymbol(input.symbol);
  const coinId = input.coinId.trim().toLowerCase();
  const currency = normalizeCurrency(input.currency);

  return createProviderRequest({
    endpoint: COINGECKO_MARKET_CHART_ENDPOINT,
    params: {
      days: input.days ?? "max",
      id: coinId,
      interval: input.interval ?? "daily",
      vs_currency: currency.toLowerCase()
    },
    provider: "coingecko",
    requestKey: `coingecko:market-chart:${coinId}:${currency.toLowerCase()}`,
    targetKind: "daily_market_data",
    targetSymbol: symbol
  });
}
