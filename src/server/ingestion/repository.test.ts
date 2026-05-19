import { describe, expect, it } from "vitest";

import { holdings, keyPriceLevels, watchlistItems } from "@/db/schema";

import { createIngestionRepository } from "./repository";

describe("createIngestionRepository", () => {
  it("includes key price level instruments in the refresh plan", async () => {
    const repository = createIngestionRepository(
      createFakeDb({
        holdings: [createInstrument("instrument_tsla", "TSLA", "stock")],
        keyPriceLevelInstruments: [
          createInstrument("instrument_btc", "btc", "crypto", {
            coingeckoId: "bitcoin"
          }),
          createInstrument("instrument_eth", "ETH", "crypto"),
          createInstrument("instrument_tsla", "tsla", "stock")
        ],
        watchlistItems: [createInstrument("instrument_hood", "HOOD", "stock")]
      }) as never
    );

    const plan = await repository.getRefreshPlan();

    expect(
      plan.marketData.map((target) => ({
        instrumentId: target.instrumentId,
        provider: target.provider,
        symbol: target.symbol
      }))
    ).toEqual([
      {
        instrumentId: "instrument_btc",
        provider: "coingecko",
        symbol: "BTC"
      },
      {
        instrumentId: "instrument_eth",
        provider: "coingecko",
        symbol: "ETH"
      },
      {
        instrumentId: "instrument_hood",
        provider: "fmp",
        symbol: "HOOD"
      },
      {
        instrumentId: "instrument_tsla",
        provider: "fmp",
        symbol: "TSLA"
      }
    ]);
    expect(
      plan.marketData.filter(
        (target) => target.instrumentId === "instrument_tsla"
      )
    ).toHaveLength(1);
    expect(plan.macroObservations.map((target) => target.seriesId)).toEqual([
      "DGS10",
      "VIXCLS"
    ]);
  });
});

type FakeInstrument = {
  assetType: "crypto" | "stock";
  currency: string;
  id: string;
  providerMetadata: Record<string, unknown>;
  symbol: string;
};

function createFakeDb(input: {
  holdings: FakeInstrument[];
  keyPriceLevelInstruments: FakeInstrument[];
  watchlistItems: FakeInstrument[];
}) {
  return {
    select() {
      return createFakeSelect(input);
    }
  };
}

function createFakeSelect(input: {
  holdings: FakeInstrument[];
  keyPriceLevelInstruments: FakeInstrument[];
  watchlistItems: FakeInstrument[];
}) {
  let rows: Array<{ instrument: FakeInstrument }> = [];
  const query = {
    from(table: unknown) {
      if (table === holdings) {
        rows = input.holdings.map((instrument) => ({ instrument }));
      } else if (table === keyPriceLevels) {
        rows = input.keyPriceLevelInstruments.map((instrument) => ({
          instrument
        }));
      } else if (table === watchlistItems) {
        rows = input.watchlistItems.map((instrument) => ({ instrument }));
      }

      return query;
    },
    innerJoin() {
      return query;
    },
    orderBy() {
      return query;
    },
    then<TResult1 = Array<{ instrument: FakeInstrument }>, TResult2 = never>(
      onFulfilled?:
        | ((
            value: Array<{ instrument: FakeInstrument }>
          ) => TResult1 | PromiseLike<TResult1>)
        | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
    where() {
      return query;
    }
  };

  return query;
}

function createInstrument(
  id: string,
  symbol: string,
  assetType: FakeInstrument["assetType"],
  providerMetadata: Record<string, unknown> = {}
): FakeInstrument {
  return {
    assetType,
    currency: "USD",
    id,
    providerMetadata,
    symbol
  };
}
