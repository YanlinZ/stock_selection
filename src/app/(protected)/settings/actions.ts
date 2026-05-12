"use server";

import { revalidatePath } from "next/cache";
import { createConfigService } from "@/server/config/service";
import {
  assetTypes,
  holdingTypes,
  keyPriceLevelTypes,
  positionSizes
} from "@/server/config/types";
import { createIngestionService } from "@/server/ingestion/service";

export async function refreshAllDataAction() {
  await createIngestionService().refreshAll({ requestedBy: "manual" });

  revalidatePath("/settings");
  revalidatePath("/health");
}

export async function addHoldingAction(formData: FormData) {
  await createConfigService().upsertHolding({
    symbol: readString(formData, "symbol"),
    name: readOptionalString(formData, "name"),
    assetType: readEnum(formData, "assetType", assetTypes, "stock"),
    holdingType: readEnum(formData, "holdingType", holdingTypes, "long_term"),
    costBasis: readOptionalString(formData, "costBasis"),
    positionSize: readEnum(formData, "positionSize", positionSizes, "unknown"),
    notes: readOptionalString(formData, "notes")
  });

  revalidatePath("/settings");
}

export async function updateHoldingAction(formData: FormData) {
  await createConfigService().updateHolding({
    id: readString(formData, "id"),
    holdingType: readEnum(formData, "holdingType", holdingTypes, "long_term"),
    costBasis: readOptionalString(formData, "costBasis"),
    positionSize: readEnum(formData, "positionSize", positionSizes, "unknown"),
    notes: readOptionalString(formData, "notes")
  });

  revalidatePath("/settings");
}

export async function deactivateHoldingAction(formData: FormData) {
  await createConfigService().deactivateHolding(readString(formData, "id"));

  revalidatePath("/settings");
}

export async function addWatchlistItemAction(formData: FormData) {
  await createConfigService().upsertWatchlistItem({
    symbol: readString(formData, "symbol"),
    name: readOptionalString(formData, "name"),
    assetType: readEnum(formData, "assetType", assetTypes, "stock"),
    priority: readOptionalString(formData, "priority") ?? "0",
    theme: readOptionalString(formData, "theme"),
    notes: readOptionalString(formData, "notes")
  });

  revalidatePath("/settings");
}

export async function updateWatchlistItemAction(formData: FormData) {
  await createConfigService().updateWatchlistItem({
    id: readString(formData, "id"),
    priority: readOptionalString(formData, "priority") ?? "0",
    theme: readOptionalString(formData, "theme"),
    notes: readOptionalString(formData, "notes")
  });

  revalidatePath("/settings");
}

export async function deactivateWatchlistItemAction(formData: FormData) {
  await createConfigService().deactivateWatchlistItem(readString(formData, "id"));

  revalidatePath("/settings");
}

export async function addKeyPriceLevelAction(formData: FormData) {
  await createConfigService().upsertKeyPriceLevel({
    symbol: readString(formData, "symbol"),
    name: readOptionalString(formData, "name"),
    assetType: readEnum(formData, "assetType", assetTypes, "stock"),
    currency: readOptionalString(formData, "currency") ?? "USD",
    levelType: readEnum(
      formData,
      "levelType",
      keyPriceLevelTypes,
      "long_term_add"
    ),
    price: readString(formData, "price"),
    notes: readOptionalString(formData, "notes")
  });

  revalidatePath("/settings");
}

export async function updateKeyPriceLevelAction(formData: FormData) {
  await createConfigService().updateKeyPriceLevel({
    id: readString(formData, "id"),
    currency: readOptionalString(formData, "currency") ?? "USD",
    levelType: readEnum(
      formData,
      "levelType",
      keyPriceLevelTypes,
      "long_term_add"
    ),
    price: readString(formData, "price"),
    notes: readOptionalString(formData, "notes")
  });

  revalidatePath("/settings");
}

export async function deactivateKeyPriceLevelAction(formData: FormData) {
  await createConfigService().deactivateKeyPriceLevel(readString(formData, "id"));

  revalidatePath("/settings");
}

export async function updateUserPreferencesAction(formData: FormData) {
  await createConfigService().upsertUserPreference({
    key: "basic_preferences",
    value: {
      primaryStyle: readEnum(
        formData,
        "primaryStyle",
        ["long_term_with_rebound", "long_term", "balanced"] as const,
        "long_term_with_rebound"
      ),
      shortTermWindowDays: readNumberInRange(formData, "shortTermWindowDays", 1, 5),
      maxExtendedOpportunities: readNumberInRange(
        formData,
        "maxExtendedOpportunities",
        0,
        1
      ),
      excludedThemes: readOptionalString(formData, "excludedThemes") ?? ""
    }
  });

  revalidatePath("/settings");
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key).trim();

  return value ? value : undefined;
}

function readEnum<TValues extends readonly string[]>(
  formData: FormData,
  key: string,
  values: TValues,
  fallback: TValues[number]
) {
  const value = readString(formData, key);

  return values.includes(value) ? (value as TValues[number]) : fallback;
}

function readNumberInRange(
  formData: FormData,
  key: string,
  min: number,
  max: number
) {
  const numberValue = Number(readString(formData, key));

  if (!Number.isFinite(numberValue)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(numberValue)));
}
