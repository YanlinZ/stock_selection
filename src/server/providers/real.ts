import { ProviderContractError } from "./errors";
import {
  createCoinGeckoMarketChartFailure,
  createCoinGeckoMarketChartResponse
} from "./coingecko";
import {
  createFmpHistoricalPricesFailure,
  createFmpHistoricalPricesResponse
} from "./fmp";
import {
  createFredSeriesObservationsFailure,
  createFredSeriesObservationsResponse
} from "./fred";
import { normalizeCurrency, normalizeSeriesId, normalizeSymbol } from "./shared";
import type {
  DailyMarketDataProvider,
  DailyMarketDataRequest,
  MacroObservationProvider
} from "./types";

type FetchLike = typeof fetch;

type RealProviderOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

type ProviderFetchResult = {
  ok: boolean;
  payload: unknown;
  status: number;
  statusText: string;
};

const fmpBaseUrl = "https://financialmodelingprep.com";
const coinGeckoBaseUrl = "https://api.coingecko.com";
const fredBaseUrl = "https://api.stlouisfed.org";
const defaultTimeoutMs = 12_000;

const defaultCoinGeckoIds: Record<string, string> = {
  BTC: "bitcoin",
  DOGE: "dogecoin",
  ETH: "ethereum",
  LINK: "chainlink",
  SOL: "solana"
};

export function createFmpProvider({
  fetchImpl = fetch,
  timeoutMs = defaultTimeoutMs
}: RealProviderOptions = {}): DailyMarketDataProvider {
  return {
    provider: "fmp",

    async getDailyPrices(input) {
      const symbol = resolveMetadataString(input.providerMetadata, "fmpSymbol")
        ? normalizeSymbol(
            resolveMetadataString(input.providerMetadata, "fmpSymbol") as string
          )
        : normalizeSymbol(input.symbol);

      if (!process.env.FMP_API_KEY) {
        return createFmpHistoricalPricesFailure({
          errorMessage: "FMP_API_KEY is not configured.",
          from: input.startDate,
          responseStatus: null,
          symbol,
          to: input.endDate
        });
      }

      const url = new URL("/stable/historical-price-eod/full", fmpBaseUrl);
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("apikey", process.env.FMP_API_KEY);

      if (input.startDate) {
        url.searchParams.set("from", input.startDate);
      }

      if (input.endDate) {
        url.searchParams.set("to", input.endDate);
      }

      try {
        const response = await fetchProviderJson(url, { fetchImpl, timeoutMs });

        if (!response.ok) {
          return createFmpHistoricalPricesFailure({
            errorMessage: createHttpErrorMessage("FMP", response),
            from: input.startDate,
            payload: response.payload,
            responseStatus: response.status,
            symbol,
            to: input.endDate
          });
        }

        return safeCreateDailyResponse(
          () =>
            createFmpHistoricalPricesResponse({
              currency: input.currency,
              from: input.startDate,
              payload: response.payload,
              responseStatus: response.status,
              symbol,
              to: input.endDate
            }),
          () =>
            createFmpHistoricalPricesFailure({
              errorMessage: "FMP response did not match the provider contract.",
              from: input.startDate,
              payload: response.payload,
              responseStatus: response.status,
              symbol,
              to: input.endDate
            })
        );
      } catch (error) {
        return createFmpHistoricalPricesFailure({
          errorMessage: normalizeNetworkError("FMP", error),
          from: input.startDate,
          responseStatus: null,
          symbol,
          to: input.endDate
        });
      }
    }
  };
}

export function createCoinGeckoProvider({
  fetchImpl = fetch,
  timeoutMs = defaultTimeoutMs
}: RealProviderOptions = {}): DailyMarketDataProvider {
  return {
    provider: "coingecko",

    async getDailyPrices(input) {
      const symbol = normalizeSymbol(input.symbol);
      const coinId = resolveCoinGeckoId(input);
      const currency = normalizeCurrency(input.currency).toLowerCase();
      const days = calculateCoinGeckoDays(input);

      if (!coinId) {
        return createCoinGeckoMarketChartFailure({
          coinId: symbol.toLowerCase(),
          currency,
          days,
          errorMessage:
            "CoinGecko coin id is not configured for this crypto symbol.",
          interval: "daily",
          responseStatus: null,
          symbol
        });
      }

      if (!process.env.COINGECKO_API_KEY) {
        return createCoinGeckoMarketChartFailure({
          coinId,
          currency,
          days,
          errorMessage: "COINGECKO_API_KEY is not configured.",
          interval: "daily",
          responseStatus: null,
          symbol
        });
      }

      const url = new URL(`/api/v3/coins/${coinId}/market_chart`, coinGeckoBaseUrl);
      url.searchParams.set("vs_currency", currency);
      url.searchParams.set("days", String(days));
      url.searchParams.set("interval", "daily");

      try {
        const response = await fetchProviderJson(url, {
          fetchImpl,
          headers: {
            "x-cg-demo-api-key": process.env.COINGECKO_API_KEY
          },
          timeoutMs
        });

        if (!response.ok) {
          return createCoinGeckoMarketChartFailure({
            coinId,
            currency,
            days,
            errorMessage: createHttpErrorMessage("CoinGecko", response),
            interval: "daily",
            payload: response.payload,
            responseStatus: response.status,
            symbol
          });
        }

        const dataResponse = await safeCreateDailyResponse(
          () =>
            createCoinGeckoMarketChartResponse({
              coinId,
              currency,
              days,
              interval: "daily",
              payload: response.payload,
              responseStatus: response.status,
              symbol
            }),
          () =>
            createCoinGeckoMarketChartFailure({
              coinId,
              currency,
              days,
              errorMessage:
                "CoinGecko response did not match the provider contract.",
              interval: "daily",
              payload: response.payload,
              responseStatus: response.status,
              symbol
            })
        );

        return {
          ...dataResponse,
          points: filterDailyPointsByDateRange(dataResponse.points, input)
        };
      } catch (error) {
        return createCoinGeckoMarketChartFailure({
          coinId,
          currency,
          days,
          errorMessage: normalizeNetworkError("CoinGecko", error),
          interval: "daily",
          responseStatus: null,
          symbol
        });
      }
    }
  };
}

export function createFredProvider({
  fetchImpl = fetch,
  timeoutMs = defaultTimeoutMs
}: RealProviderOptions = {}): MacroObservationProvider {
  return {
    provider: "fred",

    async getMacroObservations(input) {
      const seriesId = normalizeSeriesId(input.seriesId);

      if (!process.env.FRED_API_KEY) {
        return createFredSeriesObservationsFailure({
          errorMessage: "FRED_API_KEY is not configured.",
          observationEnd: input.endDate,
          observationStart: input.startDate,
          responseStatus: null,
          seriesId
        });
      }

      const url = new URL("/fred/series/observations", fredBaseUrl);
      url.searchParams.set("api_key", process.env.FRED_API_KEY);
      url.searchParams.set("file_type", "json");
      url.searchParams.set("series_id", seriesId);
      url.searchParams.set("sort_order", "asc");

      if (input.startDate) {
        url.searchParams.set("observation_start", input.startDate);
      }

      if (input.endDate) {
        url.searchParams.set("observation_end", input.endDate);
      }

      try {
        const response = await fetchProviderJson(url, { fetchImpl, timeoutMs });

        if (!response.ok) {
          return createFredSeriesObservationsFailure({
            errorMessage: createHttpErrorMessage("FRED", response),
            observationEnd: input.endDate,
            observationStart: input.startDate,
            payload: response.payload,
            responseStatus: response.status,
            seriesId
          });
        }

        return safeCreateMacroResponse(
          () =>
            createFredSeriesObservationsResponse({
              observationEnd: input.endDate,
              observationStart: input.startDate,
              payload: response.payload,
              responseStatus: response.status,
              seriesId,
              unit: input.unit
            }),
          () =>
            createFredSeriesObservationsFailure({
              errorMessage: "FRED response did not match the provider contract.",
              observationEnd: input.endDate,
              observationStart: input.startDate,
              payload: response.payload,
              responseStatus: response.status,
              seriesId
            })
        );
      } catch (error) {
        return createFredSeriesObservationsFailure({
          errorMessage: normalizeNetworkError("FRED", error),
          observationEnd: input.endDate,
          observationStart: input.startDate,
          responseStatus: null,
          seriesId
        });
      }
    }
  };
}

async function fetchProviderJson(
  url: URL,
  input: {
    fetchImpl: FetchLike;
    headers?: HeadersInit;
    timeoutMs: number;
  }
): Promise<ProviderFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await input.fetchImpl(url, {
      headers: input.headers,
      signal: controller.signal
    });

    return {
      ok: response.ok,
      payload: await readResponsePayload(response),
      status: response.status,
      statusText: response.statusText
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponsePayload(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function createHttpErrorMessage(provider: string, response: ProviderFetchResult) {
  const providerMessage = extractProviderMessage(response.payload);

  if (providerMessage) {
    return `${provider} returned ${response.status}: ${providerMessage}`;
  }

  return `${provider} returned ${response.status} ${response.statusText}`.trim();
}

function extractProviderMessage(payload: unknown) {
  if (typeof payload === "string") {
    return payload.slice(0, 240);
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const value =
    record.error ??
    record["Error Message"] ??
    record.message ??
    record["error_message"];

  return typeof value === "string" ? value.slice(0, 240) : null;
}

function normalizeNetworkError(provider: string, error: unknown) {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return `${provider} request timed out.`;
    }

    return `${provider} request failed: ${error.message}`;
  }

  return `${provider} request failed.`;
}

async function safeCreateDailyResponse<T>(
  createResponse: () => T,
  createFailure: () => T
) {
  try {
    return createResponse();
  } catch (error) {
    if (error instanceof ProviderContractError) {
      return createFailure();
    }

    throw error;
  }
}

async function safeCreateMacroResponse<T>(
  createResponse: () => T,
  createFailure: () => T
) {
  try {
    return createResponse();
  } catch (error) {
    if (error instanceof ProviderContractError) {
      return createFailure();
    }

    throw error;
  }
}

function calculateCoinGeckoDays(input: DailyMarketDataRequest) {
  if (!input.startDate || !input.endDate) {
    return 45;
  }

  const start = new Date(`${input.startDate}T00:00:00.000Z`);
  const end = new Date(`${input.endDate}T00:00:00.000Z`);
  const diffMs = Math.max(end.getTime() - start.getTime(), 0);
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000)) + 1;

  return Math.min(Math.max(days, 1), 365);
}

function filterDailyPointsByDateRange<TPoint extends { date: string }>(
  points: TPoint[],
  input: DailyMarketDataRequest
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

function resolveCoinGeckoId(input: DailyMarketDataRequest) {
  const metadataCoinId = resolveMetadataString(input.providerMetadata, "coingeckoId");

  if (metadataCoinId) {
    return metadataCoinId.trim().toLowerCase();
  }

  return defaultCoinGeckoIds[normalizeSymbol(input.symbol)] ?? null;
}

function resolveMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value : null;
}
