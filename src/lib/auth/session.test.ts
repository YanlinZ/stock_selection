import { describe, expect, it, vi } from "vitest";

import {
  ACCESS_COOKIE_CLEAR_PATHS,
  createAccessToken,
  findValidAccessToken,
  getExpiredAccessCookieOptions,
  isValidAccessToken,
  passwordsMatch,
  serializeAccessCookie
} from "./session";

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

  it("finds a valid token when stale duplicate cookies are present", async () => {
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("APP_ACCESS_PASSWORD", "password");

    const token = await createAccessToken("secret", "password");

    await expect(findValidAccessToken(["stale", undefined, token])).resolves.toBe(
      token
    );
    await expect(findValidAccessToken(["stale", "older"])).resolves.toBeUndefined();

    vi.unstubAllEnvs();
  });

  it("uses explicit paths when expiring stale access cookies", () => {
    expect(ACCESS_COOKIE_CLEAR_PATHS).toContain("/");
    expect(ACCESS_COOKIE_CLEAR_PATHS).toContain("/settings");
    expect(ACCESS_COOKIE_CLEAR_PATHS).toContain("/dashboard");
    expect(getExpiredAccessCookieOptions("/settings")).toMatchObject({
      httpOnly: true,
      maxAge: 0,
      path: "/settings",
      sameSite: "lax"
    });
    expect(
      serializeAccessCookie("", getExpiredAccessCookieOptions("/settings"))
    ).toContain("Path=/settings");
    expect(
      serializeAccessCookie("", getExpiredAccessCookieOptions("/settings"))
    ).toContain("Max-Age=0");
  });
});
