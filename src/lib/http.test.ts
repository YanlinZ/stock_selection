import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "./http";

describe("sanitizeNextPath", () => {
  it("keeps local paths", () => {
    expect(sanitizeNextPath("/health?tab=db")).toBe("/health?tab=db");
  });

  it("rejects external redirects", () => {
    expect(sanitizeNextPath("https://example.com")).toBe("/");
    expect(sanitizeNextPath("//example.com")).toBe("/");
  });
});
