import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Database,
  Eye,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  WalletCards
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
  DashboardActionRecommendation,
  DashboardDataSourceSnapshot,
  DashboardEvidenceGroups,
  DashboardEvidenceItem,
  DashboardSnapshot,
  DashboardStatus,
  DashboardTargetSnapshot,
  DashboardTrustActionRecommendation,
  IndicatorValue,
  KeyLevelProximitySnapshot,
  MacroScoreSnapshot
} from "@/server/dashboard/types";

export function DashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Phase 4
          </div>
          <h1 className="mt-2 text-2xl font-semibold">Dashboard Trust</h1>
        </div>
        <Badge variant={statusBadgeVariant(snapshot.status)}>
          {formatDashboardStatus(snapshot.status)}
        </Badge>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">今日总判断</p>
              <CardTitle className="mt-2 text-2xl">
                {snapshot.summary.label}
              </CardTitle>
            </div>
            <ActionKindBadge action={snapshot.summary} />
          </CardHeader>
          <CardContent>
            <ActionDetail action={snapshot.summary} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" aria-hidden="true" />
              数据状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusLine
              label="市场数据"
              value={snapshot.dataFreshness.latestMarketDate ?? "暂无"}
            />
            <StatusLine
              label="宏观数据"
              value={snapshot.dataFreshness.latestMacroDate ?? "暂无"}
            />
            <StatusLine
              label="最近刷新"
              value={
                snapshot.dataFreshness.latestRefreshStartedAt
                  ? formatDateTime(snapshot.dataFreshness.latestRefreshStartedAt)
                  : "暂无"
              }
            />
            {snapshot.dataFreshness.warnings.length > 0 ? (
              <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                {snapshot.dataFreshness.warnings[0]}
              </div>
            ) : null}
            <a
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              href="/settings"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              刷新数据
            </a>
          </CardContent>
        </Card>
      </section>

      <MacroSection macro={snapshot.macro} />

      <OpportunitySection snapshot={snapshot} />

      <KeyLevelAlertSection alerts={snapshot.keyLevelAlerts} />

      <TargetSection
        emptyLabel="暂无持仓"
        icon={WalletCards}
        targets={snapshot.holdings}
        title="持仓状态"
      />

      <TargetSection
        emptyLabel="暂无关注标的"
        icon={Eye}
        targets={snapshot.watchlistItems}
        title="关注列表"
      />
    </div>
  );
}

function OpportunitySection({ snapshot }: { snapshot: DashboardSnapshot }) {
  const opportunity = snapshot.opportunity;
  const target = opportunity.candidate;
  const selectedEvaluation = target
    ? opportunity.evaluations.find(
        (evaluation) => evaluation.instrumentId === target.instrument.id
      ) ?? null
    : null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Target className="h-4 w-4" aria-hidden="true" />
          今日机会
        </h2>
        <Badge variant={opportunity.status === "available" ? "warning" : "secondary"}>
          {opportunity.status === "available" ? "1 个重点" : "无触发"}
        </Badge>
      </div>
      <Card>
        <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              已评估 {opportunity.evaluatedTargetCount} 个持仓/关注标的
            </p>
            <CardTitle className="mt-2 break-words text-xl">
              {opportunity.action.label}
            </CardTitle>
            {target ? (
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {target.instrument.name ?? target.instrument.assetType.toUpperCase()}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {target ? (
              <Badge variant="secondary">{formatTargetRole(target.role)}</Badge>
            ) : null}
            {selectedEvaluation?.opportunityRank ? (
              <Badge variant="secondary">
                排名 {selectedEvaluation.opportunityRank}
              </Badge>
            ) : null}
            <Badge variant={opportunity.status === "available" ? "warning" : "secondary"}>
              {opportunity.score !== null ? `评分 ${opportunity.score}` : "保持安静"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActionDetail action={opportunity.action} />
          <DataSourceGrid sources={opportunity.action.dataSources} />
          {target ? (
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <StatusLine
                label="最新价格"
                value={
                  target.latestPrice !== null
                    ? formatCurrency(target.latestPrice, target.instrument.currency)
                    : "暂无"
                }
              />
              <StatusLine
                label="日变化"
                value={
                  target.changePercent !== null
                    ? formatSignedPercent(target.changePercent)
                    : "暂无"
                }
              />
              <StatusLine label="依据日期" value={target.latestPriceDate ?? "暂无"} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function MacroSection({ macro }: { macro: MacroScoreSnapshot }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            宏观状态
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <ScoreBlock
              label="市场风险"
              score={macro.marketRiskScore}
              tone={macro.marketRiskScore !== null && macro.marketRiskScore >= 45 ? "warn" : "ok"}
            />
            <ScoreBlock
              label="反弹机会"
              score={macro.reboundOpportunityScore}
              tone={
                macro.reboundOpportunityScore !== null &&
                macro.reboundOpportunityScore >= 35
                  ? "watch"
                  : "muted"
              }
            />
          </div>
          <ActionDetail action={macro.action} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4" aria-hidden="true" />
              恐慌反弹模式
            </CardTitle>
            <p className="mt-2 text-sm font-medium">
              {macro.panicReboundMode.label}
            </p>
          </div>
          <Badge
            variant={
              macro.panicReboundMode.state === "active"
                ? "warning"
                : macro.panicReboundMode.state === "watch"
                  ? "secondary"
                  : "default"
            }
          >
            {formatPanicState(macro.panicReboundMode.state)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReasonRiskGrid
            reasons={macro.panicReboundMode.reasons}
            risks={macro.panicReboundMode.risks}
          />
          {macro.observations.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {macro.observations.map((observation) => (
                <div
                  className="rounded-md border border-border px-3 py-2 text-sm"
                  key={observation.seriesId}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{observation.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {observation.date}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-semibold">
                    {formatNumber(observation.value)}
                    {observation.unit === "percent" ? "%" : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function KeyLevelAlertSection({
  alerts
}: {
  alerts: KeyLevelProximitySnapshot[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Target className="h-4 w-4" aria-hidden="true" />
          关键价位提醒
        </h2>
        <Badge variant={alerts.length > 0 ? "warning" : "secondary"}>
          {alerts.length > 0 ? `${alerts.length} 个接近` : "无触发"}
        </Badge>
      </div>
      {alerts.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {alerts.slice(0, 4).map((alert) => (
            <Card key={alert.level.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span>{alert.level.instrument.symbol}</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {alert.distanceText}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <StatusLine
                  label={formatLevelType(alert.level.levelType)}
                  value={formatCurrency(alert.level.price, alert.level.currency)}
                />
                {alert.level.notes ? (
                  <p className="text-muted-foreground">{alert.level.notes}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyBand label="暂无接近个人关键价位的标的" />
      )}
    </section>
  );
}

function TargetSection({
  emptyLabel,
  icon: Icon,
  targets,
  title
}: {
  emptyLabel: string;
  icon: typeof WalletCards;
  targets: DashboardTargetSnapshot[];
  title: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {title}
        </h2>
        <Badge variant="secondary">{targets.length}</Badge>
      </div>
      {targets.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {targets.map((target) => (
            <TargetCard key={`${target.role}:${target.instrument.id}`} target={target} />
          ))}
        </div>
      ) : (
        <EmptyBand label={emptyLabel} />
      )}
    </section>
  );
}

function TargetCard({ target }: { target: DashboardTargetSnapshot }) {
  return (
    <Card>
      <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <span className="break-all">{target.instrument.symbol}</span>
            <Badge variant="secondary">{formatTargetRole(target.role)}</Badge>
          </CardTitle>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {target.instrument.name ?? target.instrument.assetType.toUpperCase()}
          </p>
        </div>
        <div className="min-w-0 text-left sm:text-right">
          <p className="text-lg font-semibold">
            {target.latestPrice !== null
              ? formatCurrency(target.latestPrice, target.instrument.currency)
              : "暂无价格"}
          </p>
          <p
            className={cn(
              "text-xs font-medium",
              target.changePercent !== null && target.changePercent < 0
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {target.changePercent !== null
              ? formatSignedPercent(target.changePercent)
              : "变化暂无"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActionDetail action={target.action} />
        <DataSourceGrid sources={target.action.dataSources} />
        <div className="grid gap-2 sm:grid-cols-4">
          {([8, 21, 50, 200] as const).map((window) => (
            <IndicatorPill
              indicator={target.movingAverages[window]}
              key={window}
              label={`MA${window}`}
            />
          ))}
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <StatusLine
            label="近高"
            value={
              target.recentRange.high !== null
                ? `${formatNumber(target.recentRange.high)} · ${target.recentRange.highDate}`
                : "暂无"
            }
          />
          <StatusLine
            label="近低"
            value={
              target.recentRange.low !== null
                ? `${formatNumber(target.recentRange.low)} · ${target.recentRange.lowDate}`
                : "暂无"
            }
          />
          <StatusLine
            label="成交量"
            value={
              target.volumeChange.percent !== null
                ? formatSignedPercent(target.volumeChange.percent)
                : (target.volumeChange.message ?? "暂无")
            }
          />
          <StatusLine label="依据日期" value={target.latestPriceDate ?? "暂无"} />
        </div>
        {target.keyLevels.length > 0 ? (
          <div className="space-y-2">
            {target.keyLevels.slice(0, 3).map((level) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                key={level.level.id}
              >
                <span>{formatLevelType(level.level.levelType)}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatNumber(level.level.price)} · {level.distanceText}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScoreBlock({
  label,
  score,
  tone
}: {
  label: string;
  score: number | null;
  tone: "muted" | "ok" | "warn" | "watch";
}) {
  const percentage = score ?? 0;

  return (
    <div className="rounded-md border border-border px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm">
          {score === null ? "N/A" : `${score}/100`}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            tone === "warn"
              ? "bg-destructive"
              : tone === "watch"
                ? "bg-accent"
                : tone === "ok"
                  ? "bg-primary"
                  : "bg-muted-foreground"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function IndicatorPill({
  indicator,
  label
}: {
  indicator: IndicatorValue;
  label: string;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">
        {indicator.value !== null ? formatNumber(indicator.value) : "暂无"}
      </p>
    </div>
  );
}

function ActionDetail({ action }: { action: DashboardActionRecommendation }) {
  const trustAction = isTrustAction(action) ? action : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ActionKindBadge action={action} />
        {trustAction ? (
          <>
            <ConfidenceBadge confidence={trustAction.confidence} />
            <DataQualityBadge dataQuality={trustAction.dataQuality} />
          </>
        ) : null}
        <span className="inline-flex h-6 items-center gap-1 rounded-md bg-muted px-2 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          依据 {action.basisDate ?? "暂无"}
        </span>
      </div>
      {trustAction ? (
        <EvidenceGrid evidence={trustAction.evidence} />
      ) : (
        <ReasonRiskGrid reasons={action.reasons} risks={action.risks} />
      )}
    </div>
  );
}

function isTrustAction(
  action: DashboardActionRecommendation
): action is DashboardTrustActionRecommendation {
  return "evidence" in action && "dataQuality" in action;
}

function DataSourceGrid({ sources }: { sources: DashboardDataSourceSnapshot[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">来源与更新时间</p>
      <div className="grid gap-2 md:grid-cols-2">
        {sources.map((source) => (
          <div
            className="min-w-0 rounded-md border border-border px-3 py-2 text-xs"
            key={`${source.kind}:${source.label}`}
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{source.label}</span>
              <Badge variant={dataSourceStatusVariant(source.status)}>
                {formatDataSourceStatus(source.status)}
              </Badge>
            </div>
            <p className="mt-1 break-words text-muted-foreground">
              {source.provider ? `${source.provider} · ` : ""}
              {source.basisDate ?? "暂无日期"}
            </p>
            <p className="mt-1 break-words text-muted-foreground">
              更新 {source.updatedAt ? formatDateTime(source.updatedAt) : "暂无"}
            </p>
            {source.detail ? (
              <p className="mt-1 break-words text-muted-foreground">
                {source.detail}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceGrid({ evidence }: { evidence: DashboardEvidenceGroups }) {
  const groups = [
    {
      icon: CheckCircle2,
      items: evidence.supporting,
      key: "supporting",
      title: "支持"
    },
    {
      icon: AlertTriangle,
      items: evidence.opposing,
      key: "opposing",
      title: "反对"
    },
    {
      icon: ShieldAlert,
      items: evidence.risks,
      key: "risks",
      title: "风险"
    },
    {
      icon: Database,
      items: evidence.missing,
      key: "missing",
      title: "缺口"
    }
  ];

  return (
    <div className="grid gap-3 text-sm lg:grid-cols-2">
      {groups.map((group) => (
        <EvidenceList
          icon={group.icon}
          items={group.items}
          key={group.key}
          title={group.title}
        />
      ))}
    </div>
  );
}

function EvidenceList({
  icon: Icon,
  items,
  title
}: {
  icon: typeof CheckCircle2;
  items: DashboardEvidenceItem[];
  title: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border px-3 py-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li className="min-w-0 break-words text-sm" key={`${title}:${item.label}`}>
              <p>{item.label}</p>
              {item.detail ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              ) : null}
              <p className="mt-0.5 break-words font-mono text-[11px] text-muted-foreground">
                {formatEvidenceSource(item.source)} · {item.basisDate ?? "暂无日期"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">暂无</p>
      )}
    </div>
  );
}

function ReasonRiskGrid({
  reasons,
  risks
}: {
  reasons: string[];
  risks: string[];
}) {
  return (
    <div className="grid gap-3 text-sm md:grid-cols-2">
      <TextList icon={CheckCircle2} items={reasons} title="原因" />
      <TextList icon={AlertTriangle} items={risks} title="风险" />
    </div>
  );
}

function TextList({
  icon: Icon,
  items,
  title
}: {
  icon: typeof CheckCircle2;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li className="text-sm" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value}</span>
    </div>
  );
}

function EmptyBand({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function ActionKindBadge({ action }: { action: DashboardActionRecommendation }) {
  const variant =
    action.kind === "consider_small_add" ||
    action.kind === "risk_control" ||
    action.kind === "watch_key_level"
      ? "warning"
      : action.kind === "refresh_data"
        ? "secondary"
        : "default";

  return <Badge variant={variant}>{formatActionKind(action.kind)}</Badge>;
}

function ConfidenceBadge({
  confidence
}: {
  confidence: DashboardTrustActionRecommendation["confidence"];
}) {
  const variant =
    confidence === "high"
      ? "default"
      : confidence === "medium"
        ? "warning"
        : "secondary";

  return <Badge variant={variant}>{formatConfidence(confidence)}</Badge>;
}

function DataQualityBadge({
  dataQuality
}: {
  dataQuality: DashboardTrustActionRecommendation["dataQuality"];
}) {
  return (
    <Badge variant={dataQuality === "complete" ? "default" : "secondary"}>
      {formatDataQuality(dataQuality)}
    </Badge>
  );
}

function statusBadgeVariant(status: DashboardStatus) {
  if (status === "ready") {
    return "default" as const;
  }

  return status === "stale" ? ("warning" as const) : ("secondary" as const);
}

function dataSourceStatusVariant(status: DashboardDataSourceSnapshot["status"]) {
  if (status === "ready") {
    return "default" as const;
  }

  return status === "stale" || status === "partial"
    ? ("warning" as const)
    : ("secondary" as const);
}

function formatDashboardStatus(status: DashboardStatus) {
  const labels: Record<DashboardStatus, string> = {
    ready: "可用",
    stale: "需刷新",
    unavailable: "数据不足"
  };

  return labels[status];
}

function formatConfidence(
  confidence: DashboardTrustActionRecommendation["confidence"]
) {
  const labels: Record<DashboardTrustActionRecommendation["confidence"], string> = {
    high: "高置信",
    low: "低置信",
    medium: "中置信"
  };

  return labels[confidence];
}

function formatDataQuality(
  dataQuality: DashboardTrustActionRecommendation["dataQuality"]
) {
  const labels: Record<DashboardTrustActionRecommendation["dataQuality"], string> = {
    complete: "数据完整",
    partial: "部分缺失",
    stale: "数据过期",
    unavailable: "数据不足"
  };

  return labels[dataQuality];
}

function formatDataSourceStatus(status: DashboardDataSourceSnapshot["status"]) {
  const labels: Record<DashboardDataSourceSnapshot["status"], string> = {
    partial: "部分",
    ready: "可用",
    stale: "过期",
    unavailable: "不足"
  };

  return labels[status];
}

function formatActionKind(kind: DashboardActionRecommendation["kind"]) {
  const labels: Record<DashboardActionRecommendation["kind"], string> = {
    consider_small_add: "小仓观察",
    observe: "观察",
    refresh_data: "刷新",
    risk_control: "风控",
    wait: "不操作",
    watch_key_level: "关键价位"
  };

  return labels[kind];
}

function formatPanicState(state: MacroScoreSnapshot["panicReboundMode"]["state"]) {
  const labels: Record<MacroScoreSnapshot["panicReboundMode"]["state"], string> = {
    active: "开启",
    off: "关闭",
    watch: "预警"
  };

  return labels[state];
}

function formatTargetRole(role: DashboardTargetSnapshot["role"]) {
  const labels: Record<DashboardTargetSnapshot["role"], string> = {
    both: "持仓/关注",
    holding: "持仓",
    watchlist: "关注"
  };

  return labels[role];
}

function formatEvidenceSource(source: DashboardEvidenceItem["source"]) {
  const labels: Record<DashboardEvidenceItem["source"], string> = {
    holdings: "holdings",
    ingestion_runs: "ingestion_runs",
    key_price_levels: "key_price_levels",
    macro_observations: "macro_observations",
    market_data_daily: "market_data_daily",
    watchlist_items: "watchlist_items"
  };

  return labels[source];
}

function formatLevelType(levelType: KeyLevelProximitySnapshot["level"]["levelType"]) {
  const labels: Record<KeyLevelProximitySnapshot["level"]["levelType"], string> = {
    long_term_add: "长期加仓",
    resistance: "压力",
    risk: "风险",
    support: "支撑",
    watch: "观察"
  };

  return labels[levelType];
}

function formatCurrency(value: number, currency: string) {
  return `${formatNumber(value)} ${currency}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
    minimumFractionDigits: 0
  }).format(value);
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}
