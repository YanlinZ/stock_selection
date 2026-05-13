import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/auth/session";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
  headers: mocks.headers
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

import ProtectedLayout from "./layout";

type HeaderValues = Record<string, string | null>;

function mockHeaders(values: HeaderValues) {
  mocks.headers.mockResolvedValue({
    get: (key: string) => values[key.toLowerCase()] ?? null,
    has: (key: string) => values[key.toLowerCase()] !== undefined
  });
}

function mockCookies(tokens: string[] = []) {
  mocks.cookies.mockResolvedValue({
    get: (name: string) =>
      name === ACCESS_COOKIE_NAME && tokens[0] ? { value: tokens[0] } : undefined,
    getAll: (name: string) =>
      name === ACCESS_COOKIE_NAME
        ? tokens.map((value) => ({ name: ACCESS_COOKIE_NAME, value }))
        : []
  });
}

describe("ProtectedLayout", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("APP_ACCESS_PASSWORD", "password");
    mocks.cookies.mockReset();
    mocks.headers.mockReset();
    mocks.redirect.mockReset();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
  });

  it("does not trust a spoofed next-action header for protected page reads", async () => {
    mockCookies();
    mockHeaders({
      "next-action": "anything",
      "x-stock-selection-path": "/settings"
    });

    await expect(renderProtectedLayout("private")).rejects.toThrow(
      "REDIRECT:/login?error=auth-required&next=%2Fsettings"
    );
  });

  it("allows protected renders with a valid access token", async () => {
    const token = await createAccessToken("secret", "password");
    mockCookies([token]);
    mockHeaders({
      "next-action": "anything",
      "x-stock-selection-path": "/settings"
    });

    await expect(renderProtectedLayout("private")).resolves.toBe("private");
  });

  it("allows protected renders when an old duplicate cookie appears first", async () => {
    const token = await createAccessToken("secret", "password");
    mockCookies(["stale-token", token]);
    mockHeaders({
      "next-action": "anything",
      "x-stock-selection-path": "/dashboard"
    });

    await expect(renderProtectedLayout("private")).resolves.toBe("private");
  });
});

async function renderProtectedLayout(children: ReactNode) {
  return ProtectedLayout({ children });
}
