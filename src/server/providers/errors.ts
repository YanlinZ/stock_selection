import type { ProviderName } from "./types";

export class ProviderContractError extends Error {
  readonly endpoint: string;
  readonly provider: ProviderName;
  readonly reason: string;

  constructor(input: {
    endpoint: string;
    provider: ProviderName;
    reason: string;
  }) {
    super(`${input.provider} contract failed for ${input.endpoint}: ${input.reason}`);
    this.name = "ProviderContractError";
    this.endpoint = input.endpoint;
    this.provider = input.provider;
    this.reason = input.reason;
  }
}

export function toProviderContractError(input: {
  endpoint: string;
  error: unknown;
  provider: ProviderName;
}) {
  if (input.error instanceof ProviderContractError) {
    return input.error;
  }

  const reason =
    input.error instanceof Error ? input.error.message : "Unknown contract error.";

  return new ProviderContractError({
    endpoint: input.endpoint,
    provider: input.provider,
    reason
  });
}
