import { z } from "zod";

import { toProviderContractError } from "./errors";
import {
  createProviderFailure,
  createProviderRequest,
  createRawResponse,
  dateStringSchema,
  normalizeSeriesId
} from "./shared";
import type { MacroObservationPoint, ProviderDataResponse } from "./types";

const FRED_SERIES_OBSERVATIONS_ENDPOINT = "/fred/series/observations";

const fredObservationSchema = z.object({
  date: dateStringSchema,
  realtime_end: dateStringSchema.optional(),
  realtime_start: dateStringSchema.optional(),
  value: z.string()
});

const fredSeriesObservationsPayloadSchema = z.object({
  observations: z.array(fredObservationSchema),
  units: z.string().optional()
});

export type FredSeriesObservationsPayload = z.input<
  typeof fredSeriesObservationsPayloadSchema
>;

export function createFredSeriesObservationsResponse(input: {
  fetchedAt?: string;
  observationEnd?: string;
  observationStart?: string;
  payload: unknown;
  responseStatus?: number | null;
  seriesId: string;
  unit?: string;
}): ProviderDataResponse<MacroObservationPoint, FredSeriesObservationsPayload> {
  const request = createFredSeriesObservationsRequest(input);
  const seriesId = request.targetSymbol ?? normalizeSeriesId(input.seriesId);

  try {
    const payload = fredSeriesObservationsPayloadSchema.parse(input.payload);
    const unit = input.unit ?? payload.units ?? null;

    return {
      points: payload.observations.flatMap((observation) => {
        const value = Number(observation.value);

        if (!Number.isFinite(value)) {
          return [];
        }

        return [
          {
            date: observation.date,
            seriesId,
            sourceProvider: "fred" as const,
            unit,
            value
          }
        ];
      }),
      rawResponse: createRawResponse({
        fetchedAt: input.fetchedAt,
        payload,
        request,
        responseStatus: input.responseStatus
      }),
      request
    };
  } catch (error) {
    throw toProviderContractError({
      endpoint: FRED_SERIES_OBSERVATIONS_ENDPOINT,
      error,
      provider: "fred"
    });
  }
}

export function createFredSeriesObservationsFailure(input: {
  errorMessage: string;
  fetchedAt?: string;
  observationEnd?: string;
  observationStart?: string;
  responseStatus?: number | null;
  seriesId: string;
}) {
  return createProviderFailure<MacroObservationPoint>({
    errorMessage: input.errorMessage,
    fetchedAt: input.fetchedAt,
    request: createFredSeriesObservationsRequest(input),
    responseStatus: input.responseStatus
  });
}

function createFredSeriesObservationsRequest(input: {
  observationEnd?: string;
  observationStart?: string;
  seriesId: string;
}) {
  const seriesId = normalizeSeriesId(input.seriesId);

  return createProviderRequest({
    endpoint: FRED_SERIES_OBSERVATIONS_ENDPOINT,
    params: {
      file_type: "json",
      observation_end: input.observationEnd ?? null,
      observation_start: input.observationStart ?? null,
      series_id: seriesId
    },
    provider: "fred",
    requestKey: `fred:series-observations:${seriesId}`,
    targetKind: "macro_observation",
    targetSymbol: seriesId
  });
}
