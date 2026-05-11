import { describe, expect, it, vi } from "vitest";

import {
  createCoinGeckoProvider,
  createFmpProvider,
  createFredProvider
} from "./real";

describe("real provider clients", () => {
  it("returns visible failures when required provider keys are missing", async () => {
    const previousFmpKey = process.env.FMP_API_KEY;
    const previousCoinGeckoKey = process.env.COINGECKO_API_KEY;
    const previousFredKey = process.env.FRED_API_KEY;
    const fetchImpl = vi.fn<typeof fetch>();

    process.env.FMP_API_KEY = "";
    process.env.COINGECKO_API_KEY = "";
    process.env.FRED_API_KEY = "";

    await expect(
      createFmpProvider({ fetchImpl }).getDailyPrices({ symbol: "TSLA" })
    ).resolves.toMatchObject({
      rawResponse: {
        errorMessage: "FMP_API_KEY is not configured.",
        responseStatus: null
      }
    });
    await expect(
      createCoinGeckoProvider({ fetchImpl }).getDailyPrices({ symbol: "BTC" })
    ).resolves.toMatchObject({
      rawResponse: {
        errorMessage: "COINGECKO_API_KEY is not configured.",
        responseStatus: null
      }
    });
    await expect(
      createFredProvider({ fetchImpl }).getMacroObservations({ seriesId: "DGS10" })
    ).resolves.toMatchObject({
      rawResponse: {
        errorMessage: "FRED_API_KEY is not configured.",
        responseStatus: null
      }
    });

    expect(fetchImpl).not.toHaveBeenCalled();

    process.env.FMP_API_KEY = previousFmpKey;
    process.env.COINGECKO_API_KEY = previousCoinGeckoKey;
    process.env.FRED_API_KEY = previousFredKey;
  });

  it("keeps provider API keys out of normalized request params", async () => {
    const previousFmpKey = process.env.FMP_API_KEY;
    process.env.FMP_API_KEY = "test-secret-key";

    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            close: 292.5,
            date: "2026-05-08"
          }
        ]),
        { status: 200 }
      )
    );

    const response = await createFmpProvider({ fetchImpl }).getDailyPrices({
      endDate: "2026-05-08",
      startDate: "2026-05-01",
      symbol: "TSLA"
    });

    expect(response.rawResponse.errorMessage).toBeNull();
    expect(response.request.params).toEqual({
      from: "2026-05-01",
      symbol: "TSLA",
      to: "2026-05-08"
    });

    process.env.FMP_API_KEY = previousFmpKey;
  });
});
