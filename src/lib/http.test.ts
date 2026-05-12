import { describe, expect, it } from "vitest";

import { createLoginPath, sanitizeNextPath } from "./http";

describe("sanitizeNextPath", () => {
  it("keeps local paths", () => {
    expect(sanitizeNextPath("/health?tab=db")).toBe("/health?tab=db");
  });

  it("rejects external redirects", () => {
    expect(sanitizeNextPath("https://example.com")).toBe("/");
    expect(sanitizeNextPath("//example.com")).toBe("/");
  });

  it("builds login redirects with sanitized next paths", () => {
    expect(createLoginPath("/settings", "auth-required")).toBe(
      "/login?error=auth-required&next=%2Fsettings"
    );
    expect(createLoginPath("https://example.com", "auth-required")).toBe(
      "/login?error=auth-required"
    );
  });
});
