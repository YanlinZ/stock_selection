import { describe, expect, it } from "vitest";

import {
  createCoinGeckoMarketChartFailure,
  createCoinGeckoMarketChartResponse
} from "./coingecko";
import { ProviderContractError } from "./errors";
import { createFakeProvider } from "./fake";
import {
  createFmpHistoricalPricesFailure,
  createFmpHistoricalPricesResponse
} from "./fmp";
import {
  createFredSeriesObservationsFailure,
  createFredSeriesObservationsResponse
} from "./fred";
import type { DailyMarketDataPoint, MacroObservationPoint } from "./types";

describe("provider contracts", () => {
  it("normalizes FMP historical EOD fixtures into daily market data points", () => {
    const response = createFmpHistoricalPricesResponse({
      fetchedAt: "2026-05-11T00:00:00.000Z",
      payload: [
        {
          adjClose: 292.18,
          close: 292.5,
          date: "2026-05-08",
          high: 300.25,
          low: 288.4,
          open: 296.2,
          volume: 123456789
        }
      ],
      symbol: " tsla "
    });

    expect(response.request).toMatchObject({
      endpoint: "/stable/historical-price-eod/full",
      provider: "fmp",
      requestKey: "fmp:historical-price-eod:TSLA",
      targetKind: "daily_market_data",
      targetSymbol: "TSLA"
    });
    expect(response.points).toEqual([
      {
        adjustedClose: 292.18,
        close: 292.5,
        currency: "USD",
        date: "2026-05-08",
        high: 300.25,
        low: 288.4,
        open: 296.2,
        sourceProvider: "fmp",
        symbol: "TSLA",
        volume: 123456789
      }
    ]);
  });

  it("normalizes CoinGecko market chart fixtures and collapses duplicate UTC days", () => {
    const response = createCoinGeckoMarketChartResponse({
      coinId: "bitcoin",
      currency: "usd",
      payload: {
        prices: [
          [1778198400000, 60000],
          [1778241600000, 61000],
          [1778284800000, 62000]
        ],
        total_volumes: [
          [1778198400000, 100],
          [1778241600000, 200],
          [1778284800000, 300]
        ]
      },
      symbol: "btc"
    });

    expect(response.request).toMatchObject({
      provider: "coingecko",
      requestKey: "coingecko:market-chart:bitcoin:usd",
      targetKind: "daily_market_data",
      targetSymbol: "BTC"
    });
    expect(response.points).toEqual([
      expect.objectContaining({
        close: 61000,
        date: "2026-05-08",
        sourceProvider: "coingecko",
        symbol: "BTC",
        volume: 200
      }),
      expect.objectContaining({
        close: 62000,
        date: "2026-05-09",
        sourceProvider: "coingecko",
        symbol: "BTC",
        volume: 300
      })
    ]);
  });

  it("normalizes FRED observations and skips missing dot values", () => {
    const response = createFredSeriesObservationsResponse({
      payload: {
        observations: [
          {
            date: "2026-05-07",
            realtime_end: "2026-05-08",
            realtime_start: "2026-05-08",
            value: "4.23"
          },
          {
            date: "2026-05-08",
            value: "."
          }
        ],
        units: "percent"
      },
      seriesId: " dgs10 "
    });

    expect(response.request).toMatchObject({
      provider: "fred",
      requestKey: "fred:series-observations:DGS10",
      targetKind: "macro_observation",
      targetSymbol: "DGS10"
    });
    expect(response.points).toEqual([
      {
        date: "2026-05-07",
        seriesId: "DGS10",
        sourceProvider: "fred",
        unit: "percent",
        value: 4.23
      }
    ]);
  });

  it("keeps empty provider responses as valid empty point sets", () => {
    const fmpResponse = createFmpHistoricalPricesResponse({
      payload: [],
      symbol: "MSFT"
    });
    const fredResponse = createFredSeriesObservationsResponse({
      payload: { observations: [] },
      seriesId: "VIXCLS"
    });

    expect(fmpResponse.points).toEqual([]);
    expect(fredResponse.points).toEqual([]);
  });

  it("captures provider error responses without producing normalized points", () => {
    const fmpFailure = createFmpHistoricalPricesFailure({
      errorMessage: "Rate limit exceeded.",
      responseStatus: 429,
      symbol: "TSLA"
    });
    const coinGeckoFailure = createCoinGeckoMarketChartFailure({
      coinId: "bitcoin",
      errorMessage: "Unauthorized.",
      responseStatus: 401,
      symbol: "BTC"
    });
    const fredFailure = createFredSeriesObservationsFailure({
      errorMessage: "Invalid series id.",
      responseStatus: 400,
      seriesId: "DGS10"
    });

    expect(fmpFailure).toMatchObject({
      points: [],
      rawResponse: {
        errorMessage: "Rate limit exceeded.",
        payload: null,
        responseStatus: 429
      }
    });
    expect(coinGeckoFailure.points).toEqual([]);
    expect(coinGeckoFailure.rawResponse.errorMessage).toBe("Unauthorized.");
    expect(fredFailure.points).toEqual([]);
    expect(fredFailure.rawResponse.errorMessage).toBe("Invalid series id.");
  });

  it("throws contract errors when required provider fields are missing", () => {
    expect(() =>
      createFmpHistoricalPricesResponse({
        payload: [
          {
            close: "",
            date: "2026-05-08",
            open: 296.2
          }
        ],
        symbol: "TSLA"
      })
    ).toThrow(ProviderContractError);

    expect(() =>
      createCoinGeckoMarketChartResponse({
        coinId: "bitcoin",
        payload: {
          total_volumes: []
        },
        symbol: "BTC"
      })
    ).toThrow(ProviderContractError);

    expect(() =>
      createFredSeriesObservationsResponse({
        payload: {
          observations: [{ date: "bad-date", value: "4.23" }]
        },
        seriesId: "DGS10"
      })
    ).toThrow(ProviderContractError);
  });

  it("provides an offline fake provider for contract and ingestion tests", async () => {
    const marketPoint: DailyMarketDataPoint = {
      adjustedClose: 291,
      close: 291,
      currency: "USD",
      date: "2026-05-08",
      high: 293,
      low: 288,
      open: 290,
      sourceProvider: "fake",
      symbol: "TSLA",
      volume: 1000
    };
    const macroPoint: MacroObservationPoint = {
      date: "2026-05-08",
      seriesId: "DGS10",
      sourceProvider: "fake",
      unit: "percent",
      value: 4.23
    };
    const fakeProvider = createFakeProvider({
      macroObservations: { DGS10: [macroPoint] },
      marketData: { TSLA: [marketPoint] }
    });

    await expect(
      fakeProvider.getDailyPrices({
        endDate: "2026-05-08",
        startDate: "2026-05-08",
        symbol: "tsla"
      })
    ).resolves.toMatchObject({
      points: [expect.objectContaining({ symbol: "TSLA" })],
      request: {
        provider: "fake",
        targetKind: "daily_market_data",
        targetSymbol: "TSLA"
      }
    });

    await expect(
      fakeProvider.getMacroObservations({
        seriesId: "dgs10",
        startDate: "2026-05-08"
      })
    ).resolves.toMatchObject({
      points: [expect.objectContaining({ seriesId: "DGS10" })],
      request: {
        provider: "fake",
        targetKind: "macro_observation",
        targetSymbol: "DGS10"
      }
    });
  });
});
