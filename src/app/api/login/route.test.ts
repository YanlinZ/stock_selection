import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCESS_COOKIE_CLEAR_PATHS,
  ACCESS_COOKIE_NAME
} from "@/lib/auth/session";

import { POST } from "./route";

describe("POST /api/login", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("APP_ACCESS_PASSWORD", "password");
  });

  it("clears stale path-scoped access cookies before setting the root cookie", async () => {
    const response = await POST(
      new Request("https://example.test/api/login", {
        body: new URLSearchParams({
          next: "/",
          password: "password"
        }),
        method: "POST"
      })
    );

    const setCookies = getSetCookies(response.headers);

    expect(setCookies).toHaveLength(ACCESS_COOKIE_CLEAR_PATHS.length + 1);

    for (const path of ACCESS_COOKIE_CLEAR_PATHS) {
      expect(setCookies).toContainEqual(
        expect.stringContaining(`${ACCESS_COOKIE_NAME}=; Path=${path};`)
      );
    }

    expect(setCookies.at(-1)).toContain(`${ACCESS_COOKIE_NAME}=`);
    expect(setCookies.at(-1)).toContain("Path=/");
    expect(setCookies.at(-1)).toContain("Max-Age=604800");
  });
});

function getSetCookies(headers: Headers) {
  return (headers as Headers & { getSetCookie: () => string[] }).getSetCookie();
}
