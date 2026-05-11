import { z } from "zod";

import { toProviderContractError } from "./errors";
import {
  apiNumberSchema,
  createProviderFailure,
  createProviderRequest,
  createRawResponse,
  dateStringSchema,
  normalizeCurrency,
  normalizeSymbol,
  optionalApiNumberSchema
} from "./shared";
import type { DailyMarketDataPoint, ProviderDataResponse } from "./types";

const FMP_HISTORICAL_PRICE_ENDPOINT = "/stable/historical-price-eod/full";

const fmpHistoricalPriceRowSchema = z.object({
  adjClose: optionalApiNumberSchema,
  adjustedClose: optionalApiNumberSchema,
  close: apiNumberSchema,
  date: dateStringSchema,
  high: optionalApiNumberSchema,
  low: optionalApiNumberSchema,
  open: optionalApiNumberSchema,
  volume: optionalApiNumberSchema
});

const fmpHistoricalPricePayloadSchema = z.union([
  z.array(fmpHistoricalPriceRowSchema),
  z.object({
    historical: z.array(fmpHistoricalPriceRowSchema)
  })
]);

export type FmpHistoricalPricePayload = z.input<
  typeof fmpHistoricalPricePayloadSchema
>;

export function createFmpHistoricalPricesResponse(input: {
  currency?: string;
  fetchedAt?: string;
  from?: string;
  payload: unknown;
  responseStatus?: number | null;
  symbol: string;
  to?: string;
}): ProviderDataResponse<DailyMarketDataPoint, FmpHistoricalPricePayload> {
  const request = createFmpHistoricalPricesRequest(input);
  const symbol = request.targetSymbol ?? normalizeSymbol(input.symbol);
  const currency = normalizeCurrency(input.currency);

  try {
    const payload = fmpHistoricalPricePayloadSchema.parse(input.payload);
    const rows = Array.isArray(payload) ? payload : payload.historical;

    return {
      points: rows.map((row) => ({
        adjustedClose: row.adjustedClose ?? row.adjClose ?? null,
        close: row.close,
        currency,
        date: row.date,
        high: row.high ?? null,
        low: row.low ?? null,
        open: row.open ?? null,
        sourceProvider: "fmp",
        symbol,
        volume: row.volume ?? null
      })),
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
      endpoint: FMP_HISTORICAL_PRICE_ENDPOINT,
      error,
      provider: "fmp"
    });
  }
}

export function createFmpHistoricalPricesFailure(input: {
  errorMessage: string;
  fetchedAt?: string;
  from?: string;
  responseStatus?: number | null;
  symbol: string;
  to?: string;
}) {
  return createProviderFailure<DailyMarketDataPoint>({
    errorMessage: input.errorMessage,
    fetchedAt: input.fetchedAt,
    request: createFmpHistoricalPricesRequest(input),
    responseStatus: input.responseStatus
  });
}

function createFmpHistoricalPricesRequest(input: {
  from?: string;
  symbol: string;
  to?: string;
}) {
  const symbol = normalizeSymbol(input.symbol);

  return createProviderRequest({
    endpoint: FMP_HISTORICAL_PRICE_ENDPOINT,
    params: {
      from: input.from ?? null,
      symbol,
      to: input.to ?? null
    },
    provider: "fmp",
    requestKey: `fmp:historical-price-eod:${symbol}`,
    targetKind: "daily_market_data",
    targetSymbol: symbol
  });
}
