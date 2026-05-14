import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/auth/session";

import { proxy } from "./proxy";

describe("proxy", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("APP_ACCESS_PASSWORD", "password");
  });

  it("redirects unauthenticated protected reads with a next path", async () => {
    const response = await proxy(
      new NextRequest("https://example.test/settings")
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.test/login?error=auth-required&next=%2Fsettings"
    );
  });

  it("allows protected reads when a valid duplicate cookie is present", async () => {
    const token = await createAccessToken("secret", "password");
    const response = await proxy(
      new NextRequest("https://example.test/settings", {
        headers: {
          cookie: `${ACCESS_COOKIE_NAME}=stale; ${ACCESS_COOKIE_NAME}=${token}`
        }
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets non-page submissions pass through for server action auth handling", async () => {
    const response = await proxy(
      new NextRequest("https://example.test/settings", {
        method: "POST"
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
