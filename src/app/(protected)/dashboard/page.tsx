import { BarChart3, Database, Settings } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export default function DashboardPlaceholderPage() {
  return (
    <AppShell>
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phase 2</p>
              <CardTitle className="mt-2 text-2xl">Dashboard v1 准备中</CardTitle>
            </div>
            <Badge variant="secondary">未输出交易建议</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              当前线上版本已完成 Phase 1 配置页与数据入库 harness。Dashboard
              v1 将基于 normalized data 构建，仍保持规则主导、可解释和克制。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/settings">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  配置与刷新
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/health">
                  <Database className="h-4 w-4" aria-hidden="true" />
                  健康检查
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              当前边界
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>不接 AI 摘要，不做新闻/财报深度理解，不做自动定时任务。</p>
            <p>不会执行真实交易，也不会主动推送交易提醒。</p>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
