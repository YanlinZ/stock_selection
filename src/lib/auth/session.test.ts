import { describe, expect, it, vi } from "vitest";

import { createAccessToken, isValidAccessToken, passwordsMatch } from "./session";

describe("auth session helpers", () => {
  it("creates stable tokens from the configured secret and password", async () => {
    const token = await createAccessToken("secret", "password");

    await expect(createAccessToken("secret", "password")).resolves.toBe(token);
    await expect(createAccessToken("secret", "different")).resolves.not.toBe(token);
  });

  it("validates access tokens without exposing secret values", async () => {
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("APP_ACCESS_PASSWORD", "password");

    const token = await createAccessToken("secret", "password");

    await expect(isValidAccessToken(token)).resolves.toBe(true);
    await expect(isValidAccessToken("nope")).resolves.toBe(false);

    vi.unstubAllEnvs();
  });

  it("compares passwords with exact matching", () => {
    expect(passwordsMatch("password", "password")).toBe(true);
    expect(passwordsMatch("password ", "password")).toBe(false);
  });
});
