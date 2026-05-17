import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Database,
  Eye,
  History,
  RefreshCw,
  Settings,
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
  DashboardPlanStatusSnapshot,
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
      <section className="grid gap-4 lg:grid-cols-[1fr_0.7fr] lg:items-start">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Phase 5B
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-[28px]">
            Dashboard Trust
          </h1>
          <p className="mt-2 text-sm text-[#C6BFAF]">
            计划状态追踪与持仓决策证据
          </p>
        </div>
        <StatusStrip snapshot={snapshot} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.52fr]">
        <SummaryPanel action={snapshot.summary} />
        <DataFreshnessPanel snapshot={snapshot} />
      </section>

      <OpportunitySection snapshot={snapshot} />

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <MacroSection macro={snapshot.macro} />
        <KeyLevelAlertSection alerts={snapshot.keyLevelAlerts} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <TargetSection
          emptyLabel="暂无持仓"
          icon={WalletCards}
          region="holdings-table"
          targets={snapshot.holdings}
          title="持仓"
        />

        <TargetSection
          emptyLabel="暂无关注标的"
          icon={Eye}
          region="watchlist-table"
          targets={snapshot.watchlistItems}
          title="关注列表"
        />
      </section>
    </div>
  );
}

function StatusStrip({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <section
      className="rounded-lg border border-border bg-card px-4 py-4"
      data-dashboard-region="status-strip"
    >
      <p className="text-xs font-semibold text-muted-foreground">STATUS STRIP</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Badge variant={statusBadgeVariant(snapshot.status)}>
          {formatDashboardStatus(snapshot.status)}
        </Badge>
        <span className="font-mono text-xs text-[#C6BFAF]">
          Market {snapshot.dataFreshness.latestMarketDate ?? "暂无"}
        </span>
        <span className="font-mono text-xs text-[#C6BFAF]">
          Macro {snapshot.dataFreshness.latestMacroDate ?? "暂无"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="font-mono">
          Refresh{" "}
          {snapshot.dataFreshness.latestRefreshStartedAt
            ? formatDateTime(snapshot.dataFreshness.latestRefreshStartedAt)
            : "暂无"}
        </span>
        <span className="flex flex-wrap items-center gap-3">
          <a
            className="inline-flex items-center gap-1.5 text-primary transition hover:text-[#F1D488]"
            href="/dashboard/history"
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            History
          </a>
          <a
            className="inline-flex items-center gap-1.5 text-primary transition hover:text-[#F1D488]"
            href="/settings"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            Settings
          </a>
        </span>
      </div>
    </section>
  );
}

function SummaryPanel({ action }: { action: DashboardActionRecommendation }) {
  return (
    <Card>
      <CardHeader className="grid gap-4 sm:grid-cols-[1fr_260px] sm:items-end">
        <div>
          <p className="text-sm font-medium text-muted-foreground">今日总判断</p>
          <CardTitle className="mt-2 text-2xl sm:text-[28px]">
            {action.label}
          </CardTitle>
        </div>
        <div className="hidden justify-self-end sm:block" aria-hidden="true">
          <MiniSignalChart />
        </div>
      </CardHeader>
      <CardContent>
        <ActionDetail action={action} />
      </CardContent>
    </Card>
  );
}

function DataFreshnessPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-primary" aria-hidden="true" />
          数据状态
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StatusLine
            label="市场数据"
            value={snapshot.dataFreshness.latestMarketDate ?? "暂无"}
          />
          <StatusLine
            label="宏观数据"
            value={snapshot.dataFreshness.latestMacroDate ?? "暂无"}
          />
        </div>
        <StatusLine
          label="最近刷新"
          value={
            snapshot.dataFreshness.latestRefreshStartedAt
              ? formatDateTime(snapshot.dataFreshness.latestRefreshStartedAt)
              : "暂无"
          }
        />
        {snapshot.dataFreshness.warnings.length > 0 ? (
          <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-[#C6BFAF]">
            {snapshot.dataFreshness.warnings[0]}
          </div>
        ) : null}
        <a
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-[#F1D488]"
          href="/settings"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          刷新数据
        </a>
      </CardContent>
    </Card>
  );
}

function MiniSignalChart() {
  return (
    <svg className="h-24 w-64 max-w-full" fill="none" viewBox="0 0 260 92">
      <path
        d="M2 58C38 34 66 72 94 42C122 12 142 82 170 52C196 24 222 46 258 8"
        stroke="#D6B25E"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M2 82C36 66 68 86 98 70C126 54 142 88 172 68C198 50 224 70 258 48"
        opacity="0.55"
        stroke="#625C50"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
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
    <section
      className={cn(
        "rounded-lg border px-4 py-5 sm:px-7 sm:py-6",
        opportunity.status === "available"
          ? "border-primary/55 bg-[#1D190F]"
          : "border-border bg-card"
      )}
      data-dashboard-region="opportunity-panel"
    >
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr] xl:items-start">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">今日机会</p>
            <h2 className="mt-3 break-words text-2xl font-semibold leading-tight sm:text-[28px]">
              {opportunity.action.label}
            </h2>
            <p className="mt-2 text-sm text-[#C6BFAF]">
              已评估 {opportunity.evaluatedTargetCount} 个持仓/关注标的。仅展示一个高质量规则化机会。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={opportunity.status === "available" ? "warning" : "secondary"}>
              {opportunity.status === "available" ? "1 个重点" : "无触发"}
            </Badge>
            <Badge variant={opportunity.status === "available" ? "warning" : "secondary"}>
              {opportunity.score !== null ? `评分 ${opportunity.score}` : "保持观察"}
            </Badge>
            {selectedEvaluation?.opportunityRank ? (
              <Badge variant="secondary">
                排名 {selectedEvaluation.opportunityRank}
              </Badge>
            ) : null}
            {target ? (
              <Badge variant="secondary">{formatTargetRole(target.role)}</Badge>
            ) : (
              <Badge variant="secondary">无触发</Badge>
            )}
          </div>
          {target ? (
            <div className="grid gap-2 text-sm sm:grid-cols-3 xl:grid-cols-1">
              <StatusLine
                label="最新价格"
                value={
                  target.latestPrice !== null
                    ? formatCurrency(target.latestPrice, target.instrument.currency)
                    : "暂无"
                }
              />
              <SignedStatusLine
                label="日变化"
                value={
                  target.changePercent !== null
                    ? formatSignedPercent(target.changePercent)
                    : "暂无"
                }
                signedValue={target.changePercent}
              />
              <StatusLine label="依据日期" value={target.latestPriceDate ?? "暂无"} />
              <StatusLine
                label="计划状态"
                value={`${target.planStatus.label} · ${target.planStatus.message}`}
              />
            </div>
          ) : (
            <QuietReason reasons={opportunity.disqualifiedReasons} />
          )}
        </div>
        <div className="space-y-4">
          <ActionDetail action={opportunity.action} compactEvidence />
          <DataSourceGrid sources={opportunity.action.dataSources} />
        </div>
      </div>
    </section>
  );
}

function QuietReason({ reasons }: { reasons: string[] }) {
  return (
    <div className="rounded-md border border-border bg-[#0F0E0C] px-3 py-3 text-sm text-[#C6BFAF]">
      <p className="font-medium text-card-foreground">今日无高质量关注机会，保持观察。</p>
      {reasons.length > 0 ? (
        <p className="mt-2 text-muted-foreground">{reasons[0]}</p>
      ) : null}
    </div>
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
  region,
  targets,
  title
}: {
  emptyLabel: string;
  icon: typeof WalletCards;
  region: "holdings-table" | "watchlist-table";
  targets: DashboardTargetSnapshot[];
  title: string;
}) {
  return (
    <Card data-dashboard-region={region}>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            {title}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {targets.length} rows
          </span>
        </div>
      </CardHeader>
      {targets.length > 0 ? (
        <CardContent className="space-y-2 pt-4 sm:pt-4">
          {targets.map((target) => (
            <TargetRow key={`${target.role}:${target.instrument.id}`} target={target} />
          ))}
        </CardContent>
      ) : (
        <CardContent className="pt-4 sm:pt-4">
          <EmptyBand label={emptyLabel} />
        </CardContent>
      )}
    </Card>
  );
}

function TargetRow({ target }: { target: DashboardTargetSnapshot }) {
  return (
    <div className="rounded-md border border-border bg-[#0F0E0C]">
      <div className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1.1fr_0.85fr_0.65fr_0.85fr] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-all text-base font-semibold">
              {target.instrument.symbol}
            </span>
            <Badge variant="secondary">{formatTargetRole(target.role)}</Badge>
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {target.instrument.name ?? target.instrument.assetType.toUpperCase()}
          </p>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-sm text-[#C6BFAF]">
            {target.latestPrice !== null
              ? formatCurrency(target.latestPrice, target.instrument.currency)
              : "暂无价格"}
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-xs font-medium",
              target.changePercent !== null && target.changePercent < 0
                ? "text-destructive"
                : target.changePercent !== null && target.changePercent > 0
                  ? "text-positive"
                  : "text-muted-foreground"
            )}
          >
            {target.changePercent !== null
              ? formatSignedPercent(target.changePercent)
              : "变化暂无"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionKindBadge action={target.action} />
          <DataQualityBadge dataQuality={target.action.dataQuality} />
          <PlanStatusBadge planStatus={target.planStatus} />
        </div>
        <div className="font-mono text-xs text-muted-foreground md:text-right">
          依据 {target.latestPriceDate ?? target.action.basisDate ?? "暂无"}
        </div>
      </div>
      <details className="border-t border-border px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
          <span>查看证据</span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <div className="mt-4 space-y-4">
          <ActionDetail action={target.action} compactEvidence />
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
            <StatusLine
              label="计划状态"
              value={`${target.planStatus.label} · ${target.planStatus.message}`}
            />
          </div>
        {target.keyLevels.length > 0 ? (
          <div className="space-y-2">
            {target.keyLevels.slice(0, 3).map((level) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
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
        </div>
      </details>
    </div>
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

function ActionDetail({
  action,
  compactEvidence = false
}: {
  action: DashboardActionRecommendation;
  compactEvidence?: boolean;
}) {
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
        <EvidenceGrid compact={compactEvidence} evidence={trustAction.evidence} />
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

function EvidenceGrid({
  compact = false,
  evidence
}: {
  compact?: boolean;
  evidence: DashboardEvidenceGroups;
}) {
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
    <div
      className={cn(
        "grid gap-3 text-sm",
        compact ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-2"
      )}
    >
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
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border bg-[#0F0E0C] px-3 py-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value}</span>
    </div>
  );
}

function SignedStatusLine({
  label,
  signedValue,
  value
}: {
  label: string;
  signedValue: number | null;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border bg-[#0F0E0C] px-3 py-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 break-words text-right font-mono font-medium",
          signedValue !== null && signedValue < 0
            ? "text-destructive"
            : signedValue !== null && signedValue > 0
              ? "text-positive"
              : "text-card-foreground"
        )}
      >
        {value}
      </span>
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
    <Badge variant={dataQuality === "complete" ? "default" : "warning"}>
      {formatDataQuality(dataQuality)}
    </Badge>
  );
}

function PlanStatusBadge({
  planStatus
}: {
  planStatus: DashboardPlanStatusSnapshot;
}) {
  return <Badge variant={planStatusVariant(planStatus.status)}>{planStatus.label}</Badge>;
}

function statusBadgeVariant(status: DashboardStatus) {
  if (status === "ready") {
    return "positive" as const;
  }

  return status === "stale" ? ("warning" as const) : ("secondary" as const);
}

function dataSourceStatusVariant(status: DashboardDataSourceSnapshot["status"]) {
  if (status === "ready") {
    return "positive" as const;
  }

  return status === "stale" || status === "partial"
    ? ("warning" as const)
    : ("secondary" as const);
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
