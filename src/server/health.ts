import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";

const REQUIRED_ENV_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "APP_ACCESS_PASSWORD"
] as const;

const OPTIONAL_PROVIDER_ENV_KEYS = [
  "FMP_API_KEY",
  "COINGECKO_API_KEY",
  "FRED_API_KEY",
  "OPENAI_API_KEY"
] as const;

type EnvKey =
  | (typeof REQUIRED_ENV_KEYS)[number]
  | (typeof OPTIONAL_PROVIDER_ENV_KEYS)[number];

type DatabaseCheck =
  | {
      status: "ok";
      message: string;
    }
  | {
      status: "skipped";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

export type HealthPayload = {
  status: "ok" | "degraded";
  timestamp: string;
  runtime: "local" | "vercel";
  environment: string;
  checks: {
    env: Record<EnvKey, boolean>;
    database: DatabaseCheck;
  };
};

export async function collectHealth({
  checkDatabase = true
}: {
  checkDatabase?: boolean;
} = {}): Promise<HealthPayload> {
  const env = collectEnvStatus();
  const missingRequiredEnv = REQUIRED_ENV_KEYS.filter((key) => !env[key]);
  const database = await collectDatabaseStatus(checkDatabase, env.DATABASE_URL);
  const databaseHealthy = !checkDatabase || database.status === "ok";
  const status =
    missingRequiredEnv.length === 0 && databaseHealthy ? "ok" : "degraded";

  return {
    status,
    timestamp: new Date().toISOString(),
    runtime: process.env.VERCEL ? "vercel" : "local",
    environment: process.env.NODE_ENV ?? "development",
    checks: {
      env,
      database
    }
  };
}

function collectEnvStatus() {
  const entries = [...REQUIRED_ENV_KEYS, ...OPTIONAL_PROVIDER_ENV_KEYS].map((key) => [
    key,
    Boolean(process.env[key])
  ]);

  return Object.fromEntries(entries) as Record<EnvKey, boolean>;
}

async function collectDatabaseStatus(
  checkDatabase: boolean,
  hasDatabaseUrl: boolean
): Promise<DatabaseCheck> {
  if (!checkDatabase) {
    return {
      status: "skipped",
      message: "Database check skipped."
    };
  }

  if (!hasDatabaseUrl) {
    return {
      status: "error",
      message: "DATABASE_URL is not configured."
    };
  }

  try {
    const db = getDb();
    await db.execute(sql`select 1`);

    return {
      status: "ok",
      message: "Database connection succeeded."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Database check failed."
    };
  }
}
