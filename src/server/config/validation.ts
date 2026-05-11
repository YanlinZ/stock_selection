import { z } from "zod";

import {
  assetTypes,
  holdingTypes,
  keyPriceLevelTypes,
  positionSizes
} from "./types";

const symbolSchema = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9./:-]*$/)
  .transform((value) => value.toUpperCase());

const currencySchema = z
  .string()
  .trim()
  .min(2)
  .max(12)
  .default("USD")
  .transform((value) => value.toUpperCase());

const optionalTextSchema = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((value) => (value ? value : null));

const optionalShortTextSchema = z
  .string()
  .trim()
  .max(120)
  .nullish()
  .transform((value) => (value ? value : null));

const metadataSchema = z.record(z.string(), z.unknown()).default({});

const optionalPositiveNumberSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().positive().optional()
);

const positiveNumberSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().positive()
);

export const instrumentInputSchema = z.object({
  symbol: symbolSchema,
  name: optionalShortTextSchema,
  assetType: z.enum(assetTypes),
  currency: currencySchema,
  exchange: optionalShortTextSchema,
  providerMetadata: metadataSchema,
  isActive: z.boolean().default(true)
});

export const holdingInputSchema = z.object({
  symbol: symbolSchema,
  name: optionalShortTextSchema,
  assetType: z.enum(assetTypes).default("stock"),
  currency: currencySchema,
  exchange: optionalShortTextSchema,
  holdingType: z.enum(holdingTypes).default("long_term"),
  costBasis: optionalPositiveNumberSchema,
  positionSize: z.enum(positionSizes).default("unknown"),
  notes: optionalTextSchema,
  isActive: z.boolean().default(true)
});

export const watchlistItemInputSchema = z.object({
  symbol: symbolSchema,
  name: optionalShortTextSchema,
  assetType: z.enum(assetTypes).default("stock"),
  currency: currencySchema,
  exchange: optionalShortTextSchema,
  priority: z.coerce.number().int().min(0).max(100).default(0),
  theme: optionalShortTextSchema,
  notes: optionalTextSchema,
  isActive: z.boolean().default(true)
});

export const keyPriceLevelInputSchema = z.object({
  symbol: symbolSchema,
  name: optionalShortTextSchema,
  assetType: z.enum(assetTypes).default("stock"),
  currency: currencySchema,
  exchange: optionalShortTextSchema,
  levelType: z.enum(keyPriceLevelTypes),
  price: positiveNumberSchema,
  notes: optionalTextSchema,
  isActive: z.boolean().default(true)
});

export const userPreferenceInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/),
  value: z.record(z.string(), z.unknown())
});

export type InstrumentInput = z.input<typeof instrumentInputSchema>;
export type HoldingInput = z.input<typeof holdingInputSchema>;
export type WatchlistItemInput = z.input<typeof watchlistItemInputSchema>;
export type KeyPriceLevelInput = z.input<typeof keyPriceLevelInputSchema>;
export type UserPreferenceInput = z.input<typeof userPreferenceInputSchema>;
