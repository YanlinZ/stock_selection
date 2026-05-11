import {
  holdingInputSchema,
  instrumentInputSchema,
  keyPriceLevelInputSchema,
  userPreferenceInputSchema,
  watchlistItemInputSchema,
  type HoldingInput,
  type InstrumentInput,
  type KeyPriceLevelInput,
  type UserPreferenceInput,
  type WatchlistItemInput
} from "./validation";
import { createConfigRepository, type ConfigRepository } from "./repository";

export function createConfigService(
  repository: ConfigRepository = createConfigRepository()
) {
  return {
    async upsertInstrument(input: InstrumentInput) {
      const parsed = instrumentInputSchema.parse(input);

      return repository.upsertInstrument({
        symbol: parsed.symbol,
        name: parsed.name,
        assetType: parsed.assetType,
        currency: parsed.currency,
        exchange: parsed.exchange,
        providerMetadata: parsed.providerMetadata,
        isActive: parsed.isActive
      });
    },

    async upsertHolding(input: HoldingInput) {
      const parsed = holdingInputSchema.parse(input);
      const instrument = await repository.upsertInstrument({
        symbol: parsed.symbol,
        name: parsed.name,
        assetType: parsed.assetType,
        currency: parsed.currency,
        exchange: parsed.exchange,
        providerMetadata: {},
        isActive: true
      });

      return repository.upsertHolding({
        instrumentId: instrument.id,
        holdingType: parsed.holdingType,
        costBasis: toNumericString(parsed.costBasis),
        positionSize: parsed.positionSize,
        notes: parsed.notes,
        isActive: parsed.isActive
      });
    },

    async upsertWatchlistItem(input: WatchlistItemInput) {
      const parsed = watchlistItemInputSchema.parse(input);
      const instrument = await repository.upsertInstrument({
        symbol: parsed.symbol,
        name: parsed.name,
        assetType: parsed.assetType,
        currency: parsed.currency,
        exchange: parsed.exchange,
        providerMetadata: {},
        isActive: true
      });

      return repository.upsertWatchlistItem({
        instrumentId: instrument.id,
        priority: parsed.priority,
        theme: parsed.theme,
        notes: parsed.notes,
        isActive: parsed.isActive
      });
    },

    async upsertKeyPriceLevel(input: KeyPriceLevelInput) {
      const parsed = keyPriceLevelInputSchema.parse(input);
      const instrument = await repository.upsertInstrument({
        symbol: parsed.symbol,
        name: parsed.name,
        assetType: parsed.assetType,
        currency: parsed.currency,
        exchange: parsed.exchange,
        providerMetadata: {},
        isActive: true
      });

      return repository.upsertKeyPriceLevel({
        instrumentId: instrument.id,
        levelType: parsed.levelType,
        price: String(parsed.price),
        currency: parsed.currency,
        notes: parsed.notes,
        isActive: parsed.isActive
      });
    },

    async upsertUserPreference(input: UserPreferenceInput) {
      const parsed = userPreferenceInputSchema.parse(input);

      return repository.upsertUserPreference({
        key: parsed.key,
        value: parsed.value
      });
    }
  };
}

function toNumericString(value: number | undefined) {
  return typeof value === "number" ? String(value) : null;
}
