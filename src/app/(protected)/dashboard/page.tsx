import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import {
  createDashboardService,
  createUnavailableDashboardSnapshot
} from "@/server/dashboard/service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <AppShell>
      <DashboardView snapshot={await getDashboardSnapshot()} />
    </AppShell>
  );
}

async function getDashboardSnapshot() {
  try {
    return await createDashboardService().getDashboardSnapshot();
  } catch {
    return createUnavailableDashboardSnapshot({
      message: "Dashboard 数据读取失败，请确认数据库迁移和连接状态。"
    });
  }
}
