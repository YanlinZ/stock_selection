import { Database, Plus, Save, Settings, Trash2 } from "lucide-react";
import * as React from "react";

import { AppShell } from "@/components/app-shell";
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
import { cn } from "@/lib/utils";
import { createConfigService } from "@/server/config/service";
import type { ConfigSnapshot } from "@/server/config/types";

import {
  addHoldingAction,
  addKeyPriceLevelAction,
  addWatchlistItemAction,
  deactivateHoldingAction,
  deactivateKeyPriceLevelAction,
  deactivateWatchlistItemAction,
  updateHoldingAction,
  updateKeyPriceLevelAction,
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

export default async function SettingsPage() {
  const { snapshot, error } = await getConfigSnapshot();

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Settings className="h-4 w-4" aria-hidden="true" />
              Phase 1
            </div>
            <h1 className="mt-2 text-2xl font-semibold">配置</h1>
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

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <HoldingsSection snapshot={snapshot} />
          <WatchlistSection snapshot={snapshot} />
        </section>

        <KeyPriceLevelsSection snapshot={snapshot} />
      </div>
    </AppShell>
  );
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

function HoldingsSection({ snapshot }: { snapshot: ConfigSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>持仓</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={addHoldingAction} className="grid gap-3 sm:grid-cols-2">
          <TextField label="Symbol" name="symbol" placeholder="TSLA" required />
          <TextField label="名称" name="name" placeholder="Tesla" />
          <SelectField label="类型" name="assetType" options={assetTypeOptions} />
          <SelectField
            label="持仓类型"
            name="holdingType"
            options={holdingTypeOptions}
          />
          <TextField
            inputMode="decimal"
            label="成本价"
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
                className="rounded-md border border-border bg-background p-4"
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
                  action={updateHoldingAction}
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
                    inputMode="decimal"
                    label="成本价"
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
                <form action={deactivateHoldingAction} className="mt-2">
                  <input name="id" type="hidden" value={holding.id} />
                  <Button
                    className="text-destructive"
                    size="sm"
                    type="submit"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    停用
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WatchlistSection({ snapshot }: { snapshot: ConfigSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>关注列表</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={addWatchlistItemAction} className="grid gap-3 sm:grid-cols-2">
          <TextField label="Symbol" name="symbol" placeholder="HOOD" required />
          <TextField label="名称" name="name" placeholder="Robinhood" />
          <SelectField label="类型" name="assetType" options={assetTypeOptions} />
          <TextField
            defaultValue="0"
            inputMode="numeric"
            label="优先级"
            name="priority"
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
                className="rounded-md border border-border bg-background p-4"
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
                  action={updateWatchlistItemAction}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <input name="id" type="hidden" value={watchlistItem.id} />
                  <TextField
                    defaultValue={watchlistItem.priority}
                    inputMode="numeric"
                    label="优先级"
                    name="priority"
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
                <form action={deactivateWatchlistItemAction} className="mt-2">
                  <input name="id" type="hidden" value={watchlistItem.id} />
                  <Button
                    className="text-destructive"
                    size="sm"
                    type="submit"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    停用
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KeyPriceLevelsSection({ snapshot }: { snapshot: ConfigSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>关键价位</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={addKeyPriceLevelAction} className="grid gap-3 md:grid-cols-4">
          <TextField label="Symbol" name="symbol" placeholder="BTC" required />
          <SelectField label="类型" name="assetType" options={assetTypeOptions} />
          <SelectField
            label="价位类型"
            name="levelType"
            options={levelTypeOptions}
          />
          <TextField
            inputMode="decimal"
            label="价格"
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
                className="rounded-md border border-border bg-background p-4"
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
                  action={updateKeyPriceLevelAction}
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
                    inputMode="decimal"
                    label="价格"
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
                <form action={deactivateKeyPriceLevelAction} className="mt-2">
                  <input name="id" type="hidden" value={keyPriceLevel.id} />
                  <Button
                    className="text-destructive"
                    size="sm"
                    type="submit"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    停用
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TextField({
  id,
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  const generatedId = React.useId();
  const fieldId = id ?? `${name}-${generatedId}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input id={fieldId} name={name} {...props} />
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
          "flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
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
        className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
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
