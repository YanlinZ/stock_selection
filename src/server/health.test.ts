import { describe, expect, it, vi } from "vitest";

import { collectHealth } from "./health";

describe("collectHealth", () => {
  it("reports missing required environment variables without checking the database", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("APP_ACCESS_PASSWORD", "");

    const health = await collectHealth({ checkDatabase: false });

    expect(health.status).toBe("degraded");
    expect(health.checks.env.DATABASE_URL).toBe(false);
    expect(health.checks.database.status).toBe("skipped");

    vi.unstubAllEnvs();
  });

  it("marks configured required environment variables as healthy when db check is skipped", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@example.test/db");
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("APP_ACCESS_PASSWORD", "password");

    const health = await collectHealth({ checkDatabase: false });

    expect(health.status).toBe("ok");
    expect(health.checks.env.AUTH_SECRET).toBe(true);
    expect(JSON.stringify(health)).not.toContain("password");

    vi.unstubAllEnvs();
  });
});
