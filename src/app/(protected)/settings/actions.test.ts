import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/auth/session";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  headers: vi.fn(),
  revalidatePath: vi.fn(),
  configService: {
    upsertHolding: vi.fn(),
    updateHolding: vi.fn(),
    deactivateHolding: vi.fn(),
    upsertWatchlistItem: vi.fn(),
    updateWatchlistItem: vi.fn(),
    deactivateWatchlistItem: vi.fn(),
    upsertKeyPriceLevel: vi.fn(),
    updateKeyPriceLevel: vi.fn(),
    deactivateKeyPriceLevel: vi.fn(),
    upsertUserPreference: vi.fn()
  },
  ingestionService: {
    refreshAll: vi.fn()
  }
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
  headers: mocks.headers
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("@/server/config/service", () => ({
  createConfigService: () => mocks.configService
}));

vi.mock("@/server/ingestion/service", () => ({
  createIngestionService: () => mocks.ingestionService
}));

import {
  addHoldingAction,
  refreshAllDataAction,
  updateHoldingAction,
  updateUserPreferencesAction
} from "./actions";

describe("settings server actions", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("APP_ACCESS_PASSWORD", "password");
    vi.clearAllMocks();

    for (const mock of Object.values(mocks.configService)) {
      mock.mockResolvedValue({});
    }

    mocks.ingestionService.refreshAll.mockResolvedValue({});
  });

  it("accepts a valid access token from the request cookie header", async () => {
    const token = await createAccessToken("secret", "password");
    mockAuthContext({
      cookieHeader: `${ACCESS_COOKIE_NAME}=stale; ${ACCESS_COOKIE_NAME}=${token}`
    });
    const formData = createFormData({
      costBasis: "315.5",
      holdingType: "short_term",
      id: "holding_1",
      notes: "Keep watching",
      positionSize: "medium"
    });

    await updateHoldingAction("", formData);

    expect(mocks.configService.updateHolding).toHaveBeenCalledWith({
      costBasis: "315.5",
      holdingType: "short_term",
      id: "holding_1",
      notes: "Keep watching",
      positionSize: "medium"
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("falls back to the bound action token and restores the root access cookie", async () => {
    const token = await createAccessToken("secret", "password");
    const cookieStore = mockAuthContext();
    const formData = createFormData({
      assetType: "stock",
      costBasis: "300",
      holdingType: "long_term",
      name: "Tesla",
      notes: "",
      positionSize: "small",
      symbol: "TSLA"
    });

    await addHoldingAction(token, formData);

    expect(cookieStore.set).toHaveBeenCalledWith(
      ACCESS_COOKIE_NAME,
      token,
      expect.objectContaining({ path: "/" })
    );
    expect(mocks.configService.upsertHolding).toHaveBeenCalledWith({
      assetType: "stock",
      costBasis: "300",
      holdingType: "long_term",
      name: "Tesla",
      notes: undefined,
      positionSize: "small",
      symbol: "TSLA"
    });
  });

  it("rejects unauthenticated submissions before mutating config or refresh state", async () => {
    mockAuthContext();

    await expect(refreshAllDataAction("")).rejects.toThrow(
      "Unauthorized settings action."
    );

    expect(mocks.ingestionService.refreshAll).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("clamps preference numbers before saving the MVP preference payload", async () => {
    const token = await createAccessToken("secret", "password");
    mockAuthContext({ cookieTokens: [token] });
    const formData = createFormData({
      excludedThemes: "MEME",
      maxExtendedOpportunities: "4",
      primaryStyle: "balanced",
      shortTermWindowDays: "99"
    });

    await updateUserPreferencesAction("", formData);

    expect(mocks.configService.upsertUserPreference).toHaveBeenCalledWith({
      key: "basic_preferences",
      value: {
        excludedThemes: "MEME",
        maxExtendedOpportunities: 1,
        primaryStyle: "balanced",
        shortTermWindowDays: 5
      }
    });
  });
});

function mockAuthContext({
  cookieHeader = null,
  cookieTokens = []
}: {
  cookieHeader?: string | null;
  cookieTokens?: string[];
} = {}) {
  const cookieStore = {
    getAll: (name: string) =>
      name === ACCESS_COOKIE_NAME
        ? cookieTokens.map((value) => ({ name: ACCESS_COOKIE_NAME, value }))
        : [],
    set: vi.fn()
  };

  mocks.cookies.mockResolvedValue(cookieStore);
  mocks.headers.mockResolvedValue({
    get: (key: string) => (key.toLowerCase() === "cookie" ? cookieHeader : null)
  });

  return cookieStore;
}

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}
