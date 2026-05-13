import { describe, expect, it } from "vitest";

import {
  ACCESS_COOKIE_CLEAR_PATHS,
  ACCESS_COOKIE_NAME
} from "@/lib/auth/session";

import { GET } from "./route";

describe("GET /logout", () => {
  it("expires access cookies across known protected paths", () => {
    const response = GET(new Request("https://example.test/logout"));
    const setCookies = getSetCookies(response.headers);

    expect(setCookies).toHaveLength(ACCESS_COOKIE_CLEAR_PATHS.length);

    for (const path of ACCESS_COOKIE_CLEAR_PATHS) {
      const cookie = setCookies.find((value) =>
        value.includes(`${ACCESS_COOKIE_NAME}=; Path=${path};`)
      );

      expect(cookie).toContain("Max-Age=0");
    }
  });
});

function getSetCookies(headers: Headers) {
  return (headers as Headers & { getSetCookie: () => string[] }).getSetCookie();
}
