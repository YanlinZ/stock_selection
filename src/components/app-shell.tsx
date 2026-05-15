/* eslint-disable @next/next/no-html-link-for-pages -- Protected navigation must bypass the Next client router cache after login. */
import { Gauge, HeartPulse, LogOut, Settings } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-0 py-0 text-foreground sm:px-6 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-7xl overflow-hidden border-border bg-[#0B0A08] sm:min-h-[calc(100vh-3rem)] sm:rounded-lg sm:border">
        <header className="border-b border-border bg-[#0D0C09]">
          <div className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-8">
            <a
              aria-label="stock_selection home"
              className="flex min-w-0 items-center gap-3 font-semibold"
              href="/"
            >
              <BrandMark className="h-9 w-9 rounded-md" />
              <span className="hidden sm:inline">stock_selection</span>
            </a>
            <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Button
                asChild
                className="h-9 w-9 px-0 sm:w-auto sm:px-3"
                size="sm"
                title="Dashboard"
                variant="ghost"
              >
                <a aria-label="Dashboard" href="/dashboard">
                  <Gauge className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Dashboard</span>
                </a>
              </Button>
              <Button
                asChild
                className="h-9 w-9 px-0 sm:w-auto sm:px-3"
                size="sm"
                title="Settings"
                variant="ghost"
              >
                <a aria-label="Settings" href="/settings">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Settings</span>
                </a>
              </Button>
              <Button
                asChild
                className="h-9 w-9 px-0 sm:w-auto sm:px-3"
                size="sm"
                title="Health"
                variant="ghost"
              >
                <a aria-label="Health" href="/health">
                  <HeartPulse className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Health</span>
                </a>
              </Button>
              <Button asChild size="icon" title="退出" variant="ghost">
                <a aria-label="退出" href="/logout">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-8 sm:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
