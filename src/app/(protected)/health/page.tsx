import { AlertTriangle, CheckCircle2, Database, ServerCog } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { collectHealth } from "@/server/health";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const health = await collectHealth({ checkDatabase: true });
  const HealthyIcon = health.status === "ok" ? CheckCircle2 : AlertTriangle;

  return (
    <AppShell>
      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HealthyIcon className="h-5 w-5" aria-hidden="true" />
              Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
              <span>Status</span>
              <Badge variant={health.status === "ok" ? "default" : "warning"}>
                {health.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
              <span>Runtime</span>
              <span className="font-mono text-xs text-muted-foreground">
                {health.runtime}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
              <span>Checked</span>
              <span className="font-mono text-xs text-muted-foreground">
                {health.timestamp}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ServerCog className="h-4 w-4" aria-hidden="true" />
                Environment
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {Object.entries(health.checks.env).map(([key, value]) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  key={key}
                >
                  <span className="font-mono text-xs">{key}</span>
                  <Badge variant={value ? "default" : "secondary"}>
                    {value ? "set" : "empty"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" aria-hidden="true" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
                <span>Status</span>
                <Badge
                  variant={health.checks.database.status === "ok" ? "default" : "warning"}
                >
                  {health.checks.database.status}
                </Badge>
              </div>
              <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground">
                {health.checks.database.message}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
