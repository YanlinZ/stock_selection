import { BarChart3, HeartPulse, LogOut, Settings } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/88 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <Link className="flex min-w-0 items-center gap-3 font-semibold" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">stock_selection</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              asChild
              className="h-9 w-9 px-0 sm:w-auto sm:px-3"
              size="sm"
              title="Settings"
              variant="ghost"
            >
              <Link aria-label="Settings" href="/settings">
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Settings</span>
              </Link>
            </Button>
            <Button
              asChild
              className="h-9 w-9 px-0 sm:w-auto sm:px-3"
              size="sm"
              title="Health"
              variant="ghost"
            >
              <Link aria-label="Health" href="/health">
                <HeartPulse className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Health</span>
              </Link>
            </Button>
            <Button asChild size="icon" title="退出" variant="ghost">
              <Link aria-label="退出" href="/logout">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
