import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2
} from "lucide-react";
import { cookies } from "next/headers";
import * as React from "react";

import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCESS_COOKIE_NAME, findValidAccessToken } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { createConfigService } from "@/server/config/service";
import type { ConfigSnapshot } from "@/server/config/types";
import { createIngestionService } from "@/server/ingestion/service";
import type {
  DataProviderState,
  DataStatusSnapshot
} from "@/server/ingestion/types";

import {
  addHoldingAction,
  addKeyPriceLevelAction,
  addWatchlistItemAction,
  deactivateHoldingAction,
  deactivateKeyPriceLevelAction,
  deactivateWatchlistItemAction,
  refreshAllDataAction,
  updateHoldingAction,
  updateKeyPriceLevelAction,
  updateUserPreferencesAction,
  updateWatchlistItemAction
} from "./actions";

export const dynamic = "force-dynamic";

const emptySnapshot: ConfigSnapshot = {
  holdings: [],
  watchlistItems: [],
  keyPriceLevels: [],
  userPreferences: []
};

const assetTypeOptions = [
  ["stock", "Stock"],
  ["etf", "ETF"],
  ["crypto", "Crypto"],
  ["macro", "Macro"],
  ["index", "Index"],
  ["other", "Other"]
] as const;

const holdingTypeOptions = [
  ["long_term", "长期"],
  ["short_term", "短线"],
  ["watch_only", "观察"]
] as const;

const positionSizeOptions = [
  ["unknown", "未设置"],
  ["small", "小"],
  ["medium", "中"],
  ["large", "大"]
] as const;

const levelTypeOptions = [
  ["long_term_add", "长期加仓"],
  ["watch", "观察"],
  ["support", "支撑"],
  ["resistance", "压力"],
  ["risk", "风险"]
] as const;

const primaryStyleOptions = [
  ["long_term_with_rebound", "长期持仓 + 短线反弹"],
  ["long_term", "长期持仓"],
  ["balanced", "长期/短线平衡"]
] as const;

const maxExtendedOpportunityOptions = [
  ["0", "0"],
  ["1", "1"]
] as const;

const positiveNumberMin = "0.0001";

const defaultBasicPreferences = {
  primaryStyle: "long_term_with_rebound",
  shortTermWindowDays: 5,
  maxExtendedOpportunities: 1,
  excludedThemes: "生物医药、MEME、纯情绪炒作"
};

export default async function SettingsPage() {
  const [{ snapshot, error }, dataStatus, actionToken] = await Promise.all([
    getConfigSnapshot(),
    getDataStatusSnapshot(),
    getSettingsActionToken()
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Settings className="h-4 w-4 text-primary" aria-hidden="true" />
              Phase 1
            </div>
            <h1 className="mt-2 text-2xl font-semibold">配置</h1>
            <p className="mt-2 text-sm text-[#C6BFAF]">
              管理持仓、关注列表、关键价位和基础偏好。
            </p>
          </div>
          <Badge variant={error ? "warning" : "default"}>
            {error ? "需要迁移" : "可编辑"}
          </Badge>
        </section>

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" aria-hidden="true" />
                数据库未就绪
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {error}
            </CardContent>
          </Card>
        ) : null}

        <DataStatusSection
          actionToken={actionToken}
          error={dataStatus.error}
          snapshot={dataStatus.snapshot}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <HoldingsSection actionToken={actionToken} snapshot={snapshot} />
          <WatchlistSection actionToken={actionToken} snapshot={snapshot} />
        </section>

        <KeyPriceLevelsSection actionToken={actionToken} snapshot={snapshot} />

        <PreferencesSection actionToken={actionToken} snapshot={snapshot} />
      </div>
    </AppShell>
  );
}

async function getSettingsActionToken() {
  const cookieStore = await cookies();

  const token = await findValidAccessToken(
    cookieStore.getAll(ACCESS_COOKIE_NAME).map((cookie) => cookie.value)
  );

  return token ?? "";
}

async function getConfigSnapshot() {
  try {
    return {
      snapshot: await createConfigService().getConfigSnapshot(),
      error: null
    };
  } catch {
    return {
      snapshot: emptySnapshot,
      error: "配置数据表暂不可用，请确认 Phase 1 数据库迁移已应用。"
    };
  }
}

async function getDataStatusSnapshot(): Promise<{
  error: string | null;
  snapshot: DataStatusSnapshot | null;
}> {
  try {
    return {
      error: null,
      snapshot: await createIngestionService().getDataStatus()
    };
  } catch {
    return {
      error: "数据刷新状态暂不可用，请确认 Phase 1 数据库迁移已应用。",
      snapshot: null
    };
  }
}

function DataStatusSection({
  actionToken,
  error,
  snapshot
}: {
  actionToken: string;
  error: string | null;
  snapshot: DataStatusSnapshot | null;
}) {
  const batchStatus = snapshot?.batchRun?.status ?? "idle";
  const BatchIcon = batchStatus === "success" ? CheckCircle2 : Clock3;
  const refreshAllDataWithAuth = refreshAllDataAction.bind(null, actionToken);

  return (
    <Card>
      <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            数据刷新
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            FMP、CoinGecko、FRED 基础数据入库状态
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={batchStatus === "success" ? "default" : "secondary"}>
            {formatRunStatus(batchStatus)}
          </Badge>
          <form action={refreshAllDataWithAuth}>
            <Button size="sm" type="submit">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              刷新数据
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-start gap-3 rounded-md border border-border bg-[#0F0E0C] px-3 py-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {snapshot?.batchRun ? (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 rounded-md border border-border bg-[#0F0E0C] px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BatchIcon className="h-4 w-4" aria-hidden="true" />
                <span>最近一次刷新</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{formatDateTime(snapshot.batchRun.startedAt)}</span>
                <span>{formatRefreshSummary(snapshot.batchRun.summary)}</span>
              </div>
            </div>
            {snapshot.batchRun.errorMessage ? (
              <div className="flex items-start gap-2 rounded-md border border-border bg-[#0F0E0C] px-3 py-2 text-xs text-muted-foreground">
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">
                  {snapshot.batchRun.errorMessage}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-3">
          {(snapshot?.providers ?? []).map((provider) => (
            <div
            className="rounded-md border border-border bg-[#0F0E0C] p-4"
              key={provider.provider}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{formatProviderName(provider.provider)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getProviderEnvLabel(provider.provider)}
                  </p>
                </div>
                <Badge variant={provider.state === "ok" ? "default" : "warning"}>
                  {formatProviderState(provider.state)}
                </Badge>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <StatusMetric
                  label="数据日期"
                  value={provider.latestDataDate ?? "无"}
                />
                <StatusMetric
                  label="最近抓取"
                  value={formatDateTime(provider.latestFetchedAt)}
                />
                <StatusMetric label="入库行数" value={String(provider.rowCount)} />
                <StatusMetric
                  label="最近 run"
                  value={
                    provider.latestRun
                      ? formatRunStatus(provider.latestRun.status)
                      : "未运行"
                  }
                />
              </dl>

              {provider.errorMessage ? (
                <p className="mt-3 rounded-md border border-border bg-[#0F0E0C] px-3 py-2 text-xs text-muted-foreground">
                  {provider.errorMessage}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HoldingsSection({
  actionToken,
  snapshot
}: {
  actionToken: string;
  snapshot: ConfigSnapshot;
}) {
  const addHoldingWithAuth = addHoldingAction.bind(null, actionToken);
  const updateHoldingWithAuth = updateHoldingAction.bind(null, actionToken);
  const deactivateHoldingWithAuth = deactivateHoldingAction.bind(null, actionToken);

  return (
    <Card>
      <CardHeader>
        <CardTitle>持仓</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={addHoldingWithAuth} className="grid gap-3 sm:grid-cols-2">
          <TextField label="Symbol" name="symbol" placeholder="TSLA" required />
          <TextField label="名称" name="name" placeholder="Tesla" />
          <SelectField label="类型" name="assetType" options={assetTypeOptions} />
          <SelectField
            label="持仓类型"
            name="holdingType"
            options={holdingTypeOptions}
          />
          <TextField
            helpText="需大于 0"
            inputMode="decimal"
            label="成本价"
            min={positiveNumberMin}
            name="costBasis"
            placeholder="300"
            step="any"
            type="number"
          />
          <SelectField
            defaultValue="unknown"
            label="仓位"
            name="positionSize"
            options={positionSizeOptions}
          />
          <div className="sm:col-span-2">
            <TextAreaField label="备注" name="notes" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">
              <Plus className="h-4 w-4" aria-hidden="true" />
              添加持仓
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          {snapshot.holdings.length === 0 ? (
            <EmptyState label="暂无持仓" />
          ) : (
            snapshot.holdings.map(({ holding, instrument }) => (
              <div
                className="rounded-md border border-border bg-[#0F0E0C] p-4"
                key={holding.id}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{instrument.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {instrument.name ?? instrument.assetType}
                    </p>
                  </div>
                  <Badge variant="secondary">{instrument.assetType}</Badge>
                </div>
                <form
                  action={updateHoldingWithAuth}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <input name="id" type="hidden" value={holding.id} />
                  <SelectField
                    defaultValue={holding.holdingType}
                    label="持仓类型"
                    name="holdingType"
                    options={holdingTypeOptions}
                  />
                  <SelectField
                    defaultValue={holding.positionSize}
                    label="仓位"
                    name="positionSize"
                    options={positionSizeOptions}
                  />
                  <TextField
                    defaultValue={holding.costBasis ?? ""}
                    helpText="需大于 0"
                    inputMode="decimal"
                    label="成本价"
                    min={positiveNumberMin}
                    name="costBasis"
                    step="any"
                    type="number"
                  />
                  <TextAreaField
                    defaultValue={holding.notes ?? ""}
                    label="备注"
                    name="notes"
                  />
                  <div className="flex gap-2 sm:col-span-2">
                    <Button size="sm" type="submit">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      保存
                    </Button>
                  </div>
                </form>
                <form action={deactivateHoldingWithAuth} className="mt-2">
                  <input name="id" type="hidden" value={holding.id} />
                  <ConfirmSubmitButton
                    className="text-destructive"
                    confirmMessage={`确认停用 ${instrument.symbol} 持仓吗？`}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    停用
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WatchlistSection({
  actionToken,
  snapshot
}: {
  actionToken: string;
  snapshot: ConfigSnapshot;
}) {
  const addWatchlistItemWithAuth = addWatchlistItemAction.bind(null, actionToken);
  const updateWatchlistItemWithAuth = updateWatchlistItemAction.bind(
    null,
    actionToken
  );
  const deactivateWatchlistItemWithAuth = deactivateWatchlistItemAction.bind(
    null,
    actionToken
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>关注列表</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          action={addWatchlistItemWithAuth}
          className="grid gap-3 sm:grid-cols-2"
        >
          <TextField label="Symbol" name="symbol" placeholder="HOOD" required />
          <TextField label="名称" name="name" placeholder="Robinhood" />
          <SelectField label="类型" name="assetType" options={assetTypeOptions} />
          <TextField
            defaultValue="0"
            helpText="0 到 100"
            inputMode="numeric"
            label="优先级"
            max="100"
            min="0"
            name="priority"
            step="1"
            type="number"
          />
          <TextField label="主题" name="theme" placeholder="fintech" />
          <TextAreaField label="备注" name="notes" />
          <div className="sm:col-span-2">
            <Button type="submit">
              <Plus className="h-4 w-4" aria-hidden="true" />
              添加关注
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          {snapshot.watchlistItems.length === 0 ? (
            <EmptyState label="暂无关注标的" />
          ) : (
            snapshot.watchlistItems.map(({ watchlistItem, instrument }) => (
              <div
                className="rounded-md border border-border bg-[#0F0E0C] p-4"
                key={watchlistItem.id}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{instrument.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {watchlistItem.theme ?? instrument.assetType}
                    </p>
                  </div>
                  <Badge variant="secondary">P{watchlistItem.priority}</Badge>
                </div>
                <form
                  action={updateWatchlistItemWithAuth}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <input name="id" type="hidden" value={watchlistItem.id} />
                  <TextField
                    defaultValue={watchlistItem.priority}
                    helpText="0 到 100"
                    inputMode="numeric"
                    label="优先级"
                    max="100"
                    min="0"
                    name="priority"
                    step="1"
                    type="number"
                  />
                  <TextField
                    defaultValue={watchlistItem.theme ?? ""}
                    label="主题"
                    name="theme"
                  />
                  <div className="sm:col-span-2">
                    <TextAreaField
                      defaultValue={watchlistItem.notes ?? ""}
                      label="备注"
                      name="notes"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button size="sm" type="submit">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      保存
                    </Button>
                  </div>
                </form>
                <form action={deactivateWatchlistItemWithAuth} className="mt-2">
                  <input name="id" type="hidden" value={watchlistItem.id} />
                  <ConfirmSubmitButton
                    className="text-destructive"
                    confirmMessage={`确认停用 ${instrument.symbol} 关注标的吗？`}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    停用
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KeyPriceLevelsSection({
  actionToken,
  snapshot
}: {
  actionToken: string;
  snapshot: ConfigSnapshot;
}) {
  const addKeyPriceLevelWithAuth = addKeyPriceLevelAction.bind(null, actionToken);
  const updateKeyPriceLevelWithAuth = updateKeyPriceLevelAction.bind(
    null,
    actionToken
  );
  const deactivateKeyPriceLevelWithAuth = deactivateKeyPriceLevelAction.bind(
    null,
    actionToken
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>关键价位</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          action={addKeyPriceLevelWithAuth}
          className="grid gap-3 md:grid-cols-4"
        >
          <TextField label="Symbol" name="symbol" placeholder="BTC" required />
          <SelectField label="类型" name="assetType" options={assetTypeOptions} />
          <SelectField
            label="价位类型"
            name="levelType"
            options={levelTypeOptions}
          />
          <TextField
            helpText="需大于 0"
            inputMode="decimal"
            label="价格"
            min={positiveNumberMin}
            name="price"
            placeholder="60000"
            required
            step="any"
            type="number"
          />
          <TextField defaultValue="USD" label="币种" name="currency" />
          <div className="md:col-span-3">
            <TextAreaField label="备注" name="notes" />
          </div>
          <div className="md:col-span-4">
            <Button type="submit">
              <Plus className="h-4 w-4" aria-hidden="true" />
              添加价位
            </Button>
          </div>
        </form>

        <div className="grid gap-3 lg:grid-cols-2">
          {snapshot.keyPriceLevels.length === 0 ? (
            <EmptyState label="暂无关键价位" />
          ) : (
            snapshot.keyPriceLevels.map(({ keyPriceLevel, instrument }) => (
              <div
                className="rounded-md border border-border bg-[#0F0E0C] p-4"
                key={keyPriceLevel.id}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{instrument.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(keyPriceLevel.price, keyPriceLevel.currency)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {formatLevelType(keyPriceLevel.levelType)}
                  </Badge>
                </div>
                <form
                  action={updateKeyPriceLevelWithAuth}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <input name="id" type="hidden" value={keyPriceLevel.id} />
                  <SelectField
                    defaultValue={keyPriceLevel.levelType}
                    label="价位类型"
                    name="levelType"
                    options={levelTypeOptions}
                  />
                  <TextField
                    defaultValue={keyPriceLevel.price}
                    helpText="需大于 0"
                    inputMode="decimal"
                    label="价格"
                    min={positiveNumberMin}
                    name="price"
                    step="any"
                    type="number"
                  />
                  <TextField
                    defaultValue={keyPriceLevel.currency}
                    label="币种"
                    name="currency"
                  />
                  <TextAreaField
                    defaultValue={keyPriceLevel.notes ?? ""}
                    label="备注"
                    name="notes"
                  />
                  <div className="sm:col-span-2">
                    <Button size="sm" type="submit">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      保存
                    </Button>
                  </div>
                </form>
                <form action={deactivateKeyPriceLevelWithAuth} className="mt-2">
                  <input name="id" type="hidden" value={keyPriceLevel.id} />
                  <ConfirmSubmitButton
                    className="text-destructive"
                    confirmMessage={`确认停用 ${instrument.symbol} ${formatLevelType(
                      keyPriceLevel.levelType
                    )} 价位吗？`}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    停用
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PreferencesSection({
  actionToken,
  snapshot
}: {
  actionToken: string;
  snapshot: ConfigSnapshot;
}) {
  const preferences = getBasicPreferences(snapshot);
  const updateUserPreferencesWithAuth = updateUserPreferencesAction.bind(
    null,
    actionToken
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>基础偏好</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={updateUserPreferencesWithAuth}
          className="grid gap-3 md:grid-cols-4"
        >
          <SelectField
            defaultValue={preferences.primaryStyle}
            label="交易风格"
            name="primaryStyle"
            options={primaryStyleOptions}
          />
          <TextField
            defaultValue={preferences.shortTermWindowDays}
            helpText="1 到 5"
            inputMode="numeric"
            label="短线观察天数"
            max="5"
            min="1"
            name="shortTermWindowDays"
            step="1"
            type="number"
          />
          <SelectField
            defaultValue={String(preferences.maxExtendedOpportunities)}
            label="扩展机会上限"
            name="maxExtendedOpportunities"
            options={maxExtendedOpportunityOptions}
          />
          <div className="md:col-span-4">
            <TextAreaField
              defaultValue={preferences.excludedThemes}
              label="硬排除主题"
              name="excludedThemes"
            />
          </div>
          <div className="md:col-span-4">
            <Button size="sm" type="submit">
              <Save className="h-4 w-4" aria-hidden="true" />
              保存偏好
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function getBasicPreferences(snapshot: ConfigSnapshot) {
  const storedValue = snapshot.userPreferences.find(
    (preference) => preference.key === "basic_preferences"
  )?.value;
  const value = isRecord(storedValue) ? storedValue : {};

  return {
    primaryStyle: readPreferenceOption(
      value.primaryStyle,
      primaryStyleOptions,
      defaultBasicPreferences.primaryStyle
    ),
    shortTermWindowDays: readPreferenceNumber(
      value.shortTermWindowDays,
      defaultBasicPreferences.shortTermWindowDays,
      1,
      5
    ),
    maxExtendedOpportunities: readPreferenceNumber(
      value.maxExtendedOpportunities,
      defaultBasicPreferences.maxExtendedOpportunities,
      0,
      1
    ),
    excludedThemes:
      typeof value.excludedThemes === "string"
        ? value.excludedThemes
        : defaultBasicPreferences.excludedThemes
  };
}

function readPreferenceOption<TOptions extends readonly (readonly [string, string])[]>(
  value: unknown,
  options: TOptions,
  fallback: string
) {
  return typeof value === "string" &&
    options.some(([optionValue]) => optionValue === value)
    ? value
    : fallback;
}

function readPreferenceNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(numberValue)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function TextField({
  helpText,
  id,
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  helpText?: string;
  label: string;
  name: string;
}) {
  const generatedId = React.useId();
  const fieldId = id ?? `${name}-${generatedId}`;
  const helpTextId = helpText ? `${fieldId}-hint` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        aria-describedby={helpTextId}
        id={fieldId}
        name={name}
        {...props}
      />
      {helpText ? (
        <p className="text-xs text-muted-foreground" id={helpTextId}>
          {helpText}
        </p>
      ) : null}
    </div>
  );
}

function SelectField<TOptions extends readonly (readonly [string, string])[]>({
  defaultValue,
  id,
  label,
  name,
  options
}: {
  defaultValue?: string;
  id?: string;
  label: string;
  name: string;
  options: TOptions;
}) {
  const generatedId = React.useId();
  const fieldId = id ?? `${name}-${generatedId}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-[#0F0E0C] px-3 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        )}
        defaultValue={defaultValue}
        id={fieldId}
        name={name}
      >
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  id,
  label,
  name,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
}) {
  const generatedId = React.useId();
  const fieldId = id ?? `${name}-${generatedId}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <textarea
        className="min-h-20 w-full rounded-md border border-border bg-[#0F0E0C] px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        id={fieldId}
        name={name}
        {...props}
      />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function formatLevelType(value: string) {
  return (
    levelTypeOptions.find(([optionValue]) => optionValue === value)?.[1] ?? value
  );
}

function formatPrice(value: string, currency: string) {
  return `${Number(value).toLocaleString("en-US")} ${currency}`;
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-40 truncate font-mono text-xs">{value}</dd>
    </div>
  );
}

function formatProviderName(provider: string) {
  const labels: Record<string, string> = {
    coingecko: "CoinGecko",
    fmp: "FMP",
    fred: "FRED"
  };

  return labels[provider] ?? provider;
}

function getProviderEnvLabel(provider: string) {
  const isConfigured =
    provider === "fmp"
      ? Boolean(process.env.FMP_API_KEY)
      : provider === "coingecko"
        ? Boolean(process.env.COINGECKO_API_KEY)
        : provider === "fred"
          ? Boolean(process.env.FRED_API_KEY)
          : false;

  return isConfigured ? "API key 已配置" : "API key 未配置";
}

function formatProviderState(state: DataProviderState) {
  const labels: Record<DataProviderState, string> = {
    empty: "无数据",
    error: "失败",
    idle: "未运行",
    ok: "可用",
    running: "运行中",
    stale: "过期"
  };

  return labels[state];
}

function formatRunStatus(status: string) {
  const labels: Record<string, string> = {
    failed: "失败",
    idle: "未运行",
    partial_success: "部分成功",
    pending: "等待中",
    running: "运行中",
    success: "成功"
  };

  return labels[status] ?? status;
}

function formatDateTime(value: Date | string | null) {
  if (!value) {
    return "无";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatRefreshSummary(summary: Record<string, unknown>) {
  const totalTargets = readSummaryNumber(summary, "totalTargets");
  const successfulTargets = readSummaryNumber(summary, "successfulTargets");
  const failedTargets = readSummaryNumber(summary, "failedTargets");
  const pointsWritten = readSummaryNumber(summary, "pointsWritten");

  if (totalTargets === null) {
    return "暂无摘要";
  }

  return `${successfulTargets ?? 0}/${totalTargets} 成功，${failedTargets ?? 0} 失败，${pointsWritten ?? 0} 行入库`;
}

function readSummaryNumber(summary: Record<string, unknown>, key: string) {
  const value = summary[key];

  return typeof value === "number" ? value : null;
}
