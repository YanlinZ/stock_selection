"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

import {
  ACCESS_COOKIE_NAME,
  findValidAccessToken,
  getAccessCookieOptions,
  isValidAccessToken
} from "@/lib/auth/session";
import { createConfigService } from "@/server/config/service";
import {
  assetTypes,
  holdingTypes,
  keyPriceLevelTypes,
  positionSizes
} from "@/server/config/types";
import { createIngestionService } from "@/server/ingestion/service";

export async function refreshAllDataAction(actionToken: string) {
  await requireSettingsActionAuth(actionToken);

  await createIngestionService().refreshAll({ requestedBy: "manual" });

  revalidatePath("/settings");
  revalidatePath("/health");
}

export async function addHoldingAction(actionToken: string, formData: FormData) {
  await requireSettingsActionAuth(actionToken);

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

export async function updateHoldingAction(actionToken: string, formData: FormData) {
  await requireSettingsActionAuth(actionToken);

  await createConfigService().updateHolding({
    id: readString(formData, "id"),
    holdingType: readEnum(formData, "holdingType", holdingTypes, "long_term"),
    costBasis: readOptionalString(formData, "costBasis"),
    positionSize: readEnum(formData, "positionSize", positionSizes, "unknown"),
    notes: readOptionalString(formData, "notes")
  });

  revalidatePath("/settings");
}

export async function deactivateHoldingAction(
  actionToken: string,
  formData: FormData
) {
  await requireSettingsActionAuth(actionToken);

  await createConfigService().deactivateHolding(readString(formData, "id"));

  revalidatePath("/settings");
}

export async function addWatchlistItemAction(
  actionToken: string,
  formData: FormData
) {
  await requireSettingsActionAuth(actionToken);

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

export async function updateWatchlistItemAction(
  actionToken: string,
  formData: FormData
) {
  await requireSettingsActionAuth(actionToken);

  await createConfigService().updateWatchlistItem({
    id: readString(formData, "id"),
    priority: readOptionalString(formData, "priority") ?? "0",
    theme: readOptionalString(formData, "theme"),
    notes: readOptionalString(formData, "notes")
  });

  revalidatePath("/settings");
}

export async function deactivateWatchlistItemAction(
  actionToken: string,
  formData: FormData
) {
  await requireSettingsActionAuth(actionToken);

  await createConfigService().deactivateWatchlistItem(readString(formData, "id"));

  revalidatePath("/settings");
}

export async function addKeyPriceLevelAction(
  actionToken: string,
  formData: FormData
) {
  await requireSettingsActionAuth(actionToken);

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

export async function updateKeyPriceLevelAction(
  actionToken: string,
  formData: FormData
) {
  await requireSettingsActionAuth(actionToken);

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

export async function deactivateKeyPriceLevelAction(
  actionToken: string,
  formData: FormData
) {
  await requireSettingsActionAuth(actionToken);

  await createConfigService().deactivateKeyPriceLevel(readString(formData, "id"));

  revalidatePath("/settings");
}

export async function updateUserPreferencesAction(
  actionToken: string,
  formData: FormData
) {
  await requireSettingsActionAuth(actionToken);

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

async function requireSettingsActionAuth(actionToken: string | undefined) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const tokens = [
    ...cookieStore.getAll(ACCESS_COOKIE_NAME).map((cookie) => cookie.value),
    ...readCookieValues(headerStore.get("cookie"), ACCESS_COOKIE_NAME)
  ];

  if (await findValidAccessToken(tokens)) {
    return;
  }

  const validActionToken = actionToken;

  if (validActionToken && (await isValidAccessToken(validActionToken))) {
    cookieStore.set(ACCESS_COOKIE_NAME, validActionToken, getAccessCookieOptions());
    return;
  }

  throw new Error("Unauthorized settings action.");
}

function readCookieValues(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return [];
  }

  const prefix = `${name}=`;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(prefix))
    .map((cookie) => decodeURIComponent(cookie.slice(prefix.length)));
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
