import { z } from "zod";

import type {
  ProviderDataResponse,
  ProviderName,
  ProviderRawResponse,
  ProviderRequestDescriptor,
  ProviderRequestParams,
  ProviderTargetKind
} from "./types";

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date.");

export const apiNumberSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    return trimmedValue ? Number(trimmedValue) : Number.NaN;
  }

  return value;
}, z.number().finite());

export const optionalApiNumberSchema = apiNumberSchema.nullish();

export function normalizeCurrency(currency = "USD") {
  return currency.trim().toUpperCase();
}

export function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function normalizeSeriesId(seriesId: string) {
  return seriesId.trim().toUpperCase();
}

export function toUtcDateString(timestampMs: number) {
  if (!Number.isFinite(timestampMs)) {
    throw new Error("Expected a finite Unix timestamp in milliseconds.");
  }

  return new Date(timestampMs).toISOString().slice(0, 10);
}

export function createProviderRequest(input: {
  endpoint: string;
  params: ProviderRequestParams;
  provider: ProviderName;
  requestKey: string;
  targetKind: ProviderTargetKind;
  targetSymbol?: string | null;
}): ProviderRequestDescriptor {
  return {
    endpoint: input.endpoint,
    params: input.params,
    provider: input.provider,
    requestKey: input.requestKey,
    targetKind: input.targetKind,
    targetSymbol: input.targetSymbol ?? null
  };
}

export function createRawResponse<TPayload>(input: {
  errorMessage?: string | null;
  fetchedAt?: string;
  payload: TPayload | null;
  request: ProviderRequestDescriptor;
  responseStatus?: number | null;
}): ProviderRawResponse<TPayload> {
  return {
    errorMessage: input.errorMessage ?? null,
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    payload: input.payload,
    request: input.request,
    responseStatus: input.responseStatus === undefined ? 200 : input.responseStatus
  };
}

export function createProviderFailure<TPoint>(input: {
  errorMessage: string;
  fetchedAt?: string;
  payload?: unknown;
  request: ProviderRequestDescriptor;
  responseStatus?: number | null;
}): ProviderDataResponse<TPoint> {
  return {
    points: [],
    rawResponse: createRawResponse({
      errorMessage: input.errorMessage,
      fetchedAt: input.fetchedAt,
      payload: input.payload ?? null,
      request: input.request,
      responseStatus: input.responseStatus ?? null
    }),
    request: input.request
  };
}
