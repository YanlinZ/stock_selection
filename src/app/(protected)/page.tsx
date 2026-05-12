import {
  Activity,
  BarChart3,
  Database,
  KeyRound,
  Server,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { collectHealth } from "@/server/health";

export default async function HomePage() {
  const health = await collectHealth({ checkDatabase: false });

  const items = [
    {
      label: "配置页与数据入库",
      value: "Phase 1 complete",
      icon: Server
    },
    {
      label: "Provider harness",
      value: providerStatusLabel(health),
      icon: Activity
    },
    {
      label: "Password gate",
      value: health.checks.env.APP_ACCESS_PASSWORD ? "configured" : "missing",
      icon: ShieldCheck
    },
    {
      label: "Dashboard v1",
      value: "Phase 2 preparing",
      icon: BarChart3
    },
    {
      label: "Drizzle / Neon",
      value: health.checks.env.DATABASE_URL ? "configured" : "missing",
      icon: Database
    }
  ];

  return (
    <AppShell>
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phase 2</p>
              <CardTitle className="mt-2 text-2xl">
                Dashboard v1 准备阶段
              </CardTitle>
            </div>
            <Badge variant={health.status === "ok" ? "default" : "warning"}>
              {health.status === "ok" ? "就绪" : "待配置"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-md border border-border bg-background p-4"
                    key={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.label}</p>
                        <p className="text-xs uppercase text-muted-foreground">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              环境状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusLine label="DATABASE_URL" ready={health.checks.env.DATABASE_URL} />
            <StatusLine label="AUTH_SECRET" ready={health.checks.env.AUTH_SECRET} />
            <StatusLine
              label="APP_ACCESS_PASSWORD"
              ready={health.checks.env.APP_ACCESS_PASSWORD}
            />
            <Link
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              href="/dashboard"
            >
              查看 Dashboard
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              href="/settings"
            >
              配置与刷新
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              href="/health"
            >
              查看健康检查
            </Link>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function providerStatusLabel(health: Awaited<ReturnType<typeof collectHealth>>) {
  const configuredCount = [
    health.checks.env.FMP_API_KEY,
    health.checks.env.COINGECKO_API_KEY,
    health.checks.env.FRED_API_KEY
  ].filter(Boolean).length;

  return `${configuredCount}/3 configured`;
}

function StatusLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
      <span className="font-mono text-xs">{label}</span>
      <Badge variant={ready ? "default" : "secondary"}>
        {ready ? "configured" : "missing"}
      </Badge>
    </div>
  );
}
