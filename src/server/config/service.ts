import {
  holdingInputSchema,
  holdingUpdateInputSchema,
  instrumentInputSchema,
  keyPriceLevelInputSchema,
  keyPriceLevelUpdateInputSchema,
  userPreferenceInputSchema,
  watchlistItemInputSchema,
  watchlistItemUpdateInputSchema,
  configRecordIdSchema,
  type HoldingInput,
  type HoldingUpdateInput,
  type InstrumentInput,
  type KeyPriceLevelInput,
  type KeyPriceLevelUpdateInput,
  type UserPreferenceInput,
  type WatchlistItemInput,
  type WatchlistItemUpdateInput
} from "./validation";
import { createConfigRepository, type ConfigRepository } from "./repository";

export function createConfigService(
  repository: ConfigRepository = createConfigRepository()
) {
  return {
    async getConfigSnapshot() {
      return repository.getConfigSnapshot();
    },

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
    },

    async updateHolding(input: HoldingUpdateInput) {
      const parsed = holdingUpdateInputSchema.parse(input);

      return repository.updateHolding({
        id: parsed.id,
        holdingType: parsed.holdingType,
        costBasis: toNumericString(parsed.costBasis),
        positionSize: parsed.positionSize,
        notes: parsed.notes,
        isActive: parsed.isActive
      });
    },

    async updateWatchlistItem(input: WatchlistItemUpdateInput) {
      const parsed = watchlistItemUpdateInputSchema.parse(input);

      return repository.updateWatchlistItem({
        id: parsed.id,
        priority: parsed.priority,
        theme: parsed.theme,
        notes: parsed.notes,
        isActive: parsed.isActive
      });
    },

    async updateKeyPriceLevel(input: KeyPriceLevelUpdateInput) {
      const parsed = keyPriceLevelUpdateInputSchema.parse(input);

      return repository.updateKeyPriceLevel({
        id: parsed.id,
        levelType: parsed.levelType,
        price: String(parsed.price),
        currency: parsed.currency,
        notes: parsed.notes,
        isActive: parsed.isActive
      });
    },

    async deactivateHolding(id: string) {
      return repository.deactivateHolding(configRecordIdSchema.parse(id));
    },

    async deactivateWatchlistItem(id: string) {
      return repository.deactivateWatchlistItem(configRecordIdSchema.parse(id));
    },

    async deactivateKeyPriceLevel(id: string) {
      return repository.deactivateKeyPriceLevel(configRecordIdSchema.parse(id));
    }
  };
}

function toNumericString(value: number | undefined) {
  return typeof value === "number" ? String(value) : null;
}
