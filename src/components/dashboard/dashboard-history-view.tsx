import {
  ArrowLeft,
  Database,
  History,
  LineChart,
  ListChecks,
  ShieldAlert
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DashboardActionKind,
  DashboardConfidence,
  DashboardDataQuality,
  DashboardDecisionSnapshotScope,
  DashboardEvidenceItem,
  DashboardHistoryEntry,
  DashboardHistoryOutcomeWindow,
  DashboardHistorySnapshot,
  DashboardPlanStatusSnapshot,
  DashboardReviewTaskSnapshot
} from "@/server/dashboard/types";

export function DashboardHistoryView({
  history
}: {
  history: DashboardHistorySnapshot;
}) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <History className="h-4 w-4" aria-hidden="true" />
            Phase 6A
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-[28px]">
            历史判断
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#C6BFAF]">
            回看已持久化的 Dashboard 规则化判断、计划状态、待人工复盘事项，以及后续 1 / 5 / 20 个交易日的基础价格表现。
          </p>
        </div>
        <a
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-[#F1D488]"
          href="/dashboard"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回 Dashboard
        </a>
      </section>

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={history.status === "ready" ? "positive" : "secondary"}>
              {history.entries.length} 条记录
            </Badge>
            <Badge variant={history.reviewTasks.length > 0 ? "warning" : "secondary"}>
              {history.reviewTasks.length} 项待复盘
            </Badge>
            <Badge variant="secondary">1D / 5D / 20D</Badge>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            Generated {formatDateTime(history.generatedAt)}
          </span>
        </div>
      </section>

      <ReviewTaskQueue tasks={history.reviewTasks} />

      {history.entries.length > 0 ? (
        <section className="space-y-4">
          {history.entries.map((entry) => (
            <HistoryEntryCard entry={entry} key={entryKey(entry)} />
          ))}
        </section>
      ) : (
        <Card>
          <CardContent className="py-10">
            <div className="mx-auto max-w-xl text-center">
              <Database
                className="mx-auto h-8 w-8 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-semibold">
                还没有可追踪历史判断
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Dashboard 渲染并写入 daily decision snapshots 后，这里会显示最近的 summary、holding 和 opportunity 记录。
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewTaskQueue({ tasks }: { tasks: DashboardReviewTaskSnapshot[] }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
          待人工复盘
        </h2>
        <Badge variant={tasks.length > 0 ? "warning" : "secondary"}>
          {tasks.length} 项
        </Badge>
      </div>

      {tasks.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {tasks.map((task) => (
            <ReviewTaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              暂无待人工复盘事项。
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function ReviewTaskCard({ task }: { task: DashboardReviewTaskSnapshot }) {
  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={reviewTaskStatusVariant(task.status)}>
            {formatReviewTaskStatus(task.status)}
          </Badge>
          <Badge variant="secondary">{task.tradingDays}D</Badge>
          <Badge variant={planStatusVariant(task.planStatus.status)}>
            {task.planStatus.label}
          </Badge>
          <Badge variant="secondary">{formatScope(task.scope)}</Badge>
          <Badge variant={dataQualityVariant(task.dataQuality)}>
            {formatDataQuality(task.dataQuality)}
          </Badge>
        </div>

        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold leading-tight">
            {task.symbol ? `${task.symbol} · ` : ""}
            {task.actionLabel}
          </h3>
          <p className="mt-2 break-words text-sm text-muted-foreground">
            {task.message}
          </p>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <MetaLine
            label="Return"
            value={
              task.returnPercent !== null
                ? formatSignedPercent(task.returnPercent)
                : "N/A"
            }
          />
          <MetaLine
            label="Entry"
            value={formatPricePoint(task.entryDate, task.entryClose)}
          />
          <MetaLine
            label="Outcome"
            value={formatPricePoint(task.outcomeDate, task.outcomeClose)}
          />
          <MetaLine label="依据日" value={task.basisDate ?? "暂无"} />
          <MetaLine label="Rule" value={task.ruleVersion} />
          <MetaLine label="Subject" value={task.subjectKey} />
        </div>

        <div className="rounded-md border border-border bg-[#0F0E0C] px-3 py-2 text-xs text-muted-foreground">
          <p className="break-words">
            支持 {task.evidenceCounts.supporting} · 反对{" "}
            {task.evidenceCounts.opposing} · 风险 {task.evidenceCounts.risks} ·
            缺口 {task.evidenceCounts.missing}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryEntryCard({ entry }: { entry: DashboardHistoryEntry }) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{formatScope(entry.scope)}</Badge>
              <Badge variant={confidenceVariant(entry.confidence)}>
                {formatConfidence(entry.confidence)}
              </Badge>
              <Badge variant={dataQualityVariant(entry.dataQuality)}>
                {formatDataQuality(entry.dataQuality)}
              </Badge>
            </div>
            <CardTitle className="mt-3 break-words text-xl leading-tight">
              {entry.symbol ? `${entry.symbol} · ` : ""}
              {entry.actionLabel}
            </CardTitle>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
            <MetaLine label="判断日" value={entry.snapshotDate} />
            <MetaLine label="依据日" value={entry.basisDate ?? "暂无"} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <MetaLine label="Action" value={formatActionKind(entry.actionKind)} />
          <MetaLine label="Rule" value={entry.ruleVersion} />
          <MetaLine label="Subject" value={entry.subjectKey} />
          <MetaLine label="Generated" value={formatDateTime(entry.generatedAt)} />
        </div>

        <PlanStatusBlock planStatus={entry.planStatus} />

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <LineChart className="h-4 w-4" aria-hidden="true" />
            交易日表现
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {entry.outcomes.map((outcome) => (
              <OutcomeBlock key={outcome.tradingDays} outcome={outcome} />
            ))}
          </div>
        </div>

        <details className="rounded-md border border-border px-4 py-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
            <span>判断证据摘要</span>
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <EvidenceSummary
              items={entry.evidence.supporting}
              title="支持"
            />
            <EvidenceSummary
              items={entry.evidence.opposing}
              title="反对"
            />
            <EvidenceSummary items={entry.evidence.risks} title="风险" />
            <EvidenceSummary items={entry.evidence.missing} title="缺口" />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function OutcomeBlock({ outcome }: { outcome: DashboardHistoryOutcomeWindow }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-[#0F0E0C] px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{outcome.tradingDays}D</span>
        <Badge variant={outcomeStatusVariant(outcome.status)}>
          {formatOutcomeStatus(outcome.status)}
        </Badge>
      </div>
      <p
        className={cn(
          "mt-3 break-words font-mono text-lg font-semibold",
          outcome.returnPercent !== null && outcome.returnPercent > 0
            ? "text-positive"
            : outcome.returnPercent !== null && outcome.returnPercent < 0
              ? "text-destructive"
              : "text-card-foreground"
        )}
      >
        {outcome.returnPercent !== null
          ? formatSignedPercent(outcome.returnPercent)
          : "N/A"}
      </p>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p className="break-words">
          Entry {formatPricePoint(outcome.entryDate, outcome.entryClose)}
        </p>
        <p className="break-words">
          Outcome {formatPricePoint(outcome.outcomeDate, outcome.outcomeClose)}
        </p>
        <p className="break-words">{outcome.message}</p>
      </div>
    </div>
  );
}

function PlanStatusBlock({
  planStatus
}: {
  planStatus: DashboardPlanStatusSnapshot;
}) {
  return (
    <div className="rounded-md border border-border bg-[#0F0E0C] px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-muted-foreground">计划状态</h3>
        <Badge variant={planStatusVariant(planStatus.status)}>
          {planStatus.label}
        </Badge>
      </div>
      <p className="mt-2 break-words">{planStatus.message}</p>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <p className="break-words">
          最新 {formatPricePoint(planStatus.latestPriceDate, planStatus.latestPrice)}
        </p>
        <p className="break-words">
          价位{" "}
          {planStatus.levelPrice !== null
            ? `${formatNumber(planStatus.levelPrice)} · ${formatLevelType(planStatus.levelType)}`
            : "暂无"}
        </p>
        <p className="break-words">
          距离 {planStatus.distanceText ?? "暂无"}
        </p>
      </div>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border bg-[#0F0E0C] px-3 py-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value}</span>
    </div>
  );
}

function EvidenceSummary({
  items,
  title
}: {
  items: DashboardEvidenceItem[];
  title: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border px-3 py-3">
      <p className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>{title}</span>
        <span>{items.length}</span>
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {items.slice(0, 2).map((item) => (
            <li className="break-words text-sm" key={`${title}:${item.label}`}>
              <p>{item.label}</p>
              {item.detail ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">暂无</p>
      )}
    </div>
  );
}

function entryKey(entry: DashboardHistoryEntry) {
  return `${entry.snapshotDate}:${entry.scope}:${entry.subjectKey}:${entry.ruleVersion}`;
}

function formatScope(scope: DashboardDecisionSnapshotScope) {
  const labels: Record<DashboardDecisionSnapshotScope, string> = {
    holding: "持仓",
    opportunity: "机会",
    summary: "总判断"
  };

  return labels[scope];
}

function formatConfidence(confidence: DashboardConfidence) {
  const labels: Record<DashboardConfidence, string> = {
    high: "高置信",
    low: "低置信",
    medium: "中置信"
  };

  return labels[confidence];
}

function formatDataQuality(dataQuality: DashboardDataQuality) {
  const labels: Record<DashboardDataQuality, string> = {
    complete: "数据完整",
    partial: "部分缺失",
    stale: "数据过期",
    unavailable: "数据不足"
  };

  return labels[dataQuality];
}

function formatActionKind(kind: DashboardActionKind) {
  const labels: Record<DashboardActionKind, string> = {
    consider_small_add: "小仓观察",
    observe: "观察",
    refresh_data: "刷新",
    risk_control: "风控",
    wait: "不操作",
    watch_key_level: "关键价位"
  };

  return labels[kind];
}

function formatOutcomeStatus(status: DashboardHistoryOutcomeWindow["status"]) {
  const labels: Record<DashboardHistoryOutcomeWindow["status"], string> = {
    insufficient_data: "数据不足",
    pending: "等待数据",
    ready: "已观察"
  };

  return labels[status];
}

function confidenceVariant(confidence: DashboardConfidence) {
  if (confidence === "high") {
    return "positive" as const;
  }

  return confidence === "medium" ? ("warning" as const) : ("secondary" as const);
}

function dataQualityVariant(dataQuality: DashboardDataQuality) {
  return dataQuality === "complete" ? ("positive" as const) : ("warning" as const);
}

function outcomeStatusVariant(status: DashboardHistoryOutcomeWindow["status"]) {
  if (status === "ready") {
    return "positive" as const;
  }

  return status === "pending" ? ("warning" as const) : ("secondary" as const);
}

function reviewTaskStatusVariant(status: DashboardReviewTaskSnapshot["status"]) {
  if (status === "ready") {
    return "positive" as const;
  }

  return status === "pending" ? ("warning" as const) : ("secondary" as const);
}

function formatReviewTaskStatus(status: DashboardReviewTaskSnapshot["status"]) {
  const labels: Record<DashboardReviewTaskSnapshot["status"], string> = {
    insufficient_data: "复盘数据不足",
    pending: "等待复盘数据",
    ready: "已到观察窗口"
  };

  return labels[status];
}

function planStatusVariant(status: DashboardPlanStatusSnapshot["status"]) {
  if (status === "triggered" || status === "approaching") {
    return "warning" as const;
  }

  if (status === "invalidated") {
    return "destructive" as const;
  }

  if (status === "still_valid") {
    return "positive" as const;
  }

  return "secondary" as const;
}

function formatLevelType(levelType: DashboardPlanStatusSnapshot["levelType"]) {
  if (!levelType) {
    return "暂无";
  }

  const labels: Record<NonNullable<DashboardPlanStatusSnapshot["levelType"]>, string> = {
    long_term_add: "长期加仓",
    resistance: "压力",
    risk: "风险",
    support: "支撑",
    watch: "观察"
  };

  return labels[levelType];
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPricePoint(date: string | null, price: number | null) {
  if (!date || price === null) {
    return "暂无";
  }

  return `${formatNumber(price)} · ${date}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
    minimumFractionDigits: 0
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}
