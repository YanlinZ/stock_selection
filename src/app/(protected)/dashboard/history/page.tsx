import { AppShell } from "@/components/app-shell";
import { DashboardHistoryView } from "@/components/dashboard/dashboard-history-view";
import { createDashboardHistoryService } from "@/server/dashboard/service";
import type { DashboardHistorySnapshot } from "@/server/dashboard/types";

export const dynamic = "force-dynamic";

export default async function DashboardHistoryPage() {
  return (
    <AppShell>
      <DashboardHistoryView history={await getDashboardHistorySnapshot()} />
    </AppShell>
  );
}

async function getDashboardHistorySnapshot(): Promise<DashboardHistorySnapshot> {
  try {
    return await createDashboardHistoryService().getDashboardHistorySnapshot();
  } catch {
    return {
      entries: [],
      generatedAt: new Date().toISOString(),
      reviewTasks: [],
      status: "empty"
    };
  }
}
