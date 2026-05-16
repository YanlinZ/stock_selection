# QA Run: Phase 5A History Judgment And Performance Tracking Local

Date: 2026-05-16

Environment:

- Local branch `codex/phase-5a-history-performance`
- Local Next.js dev server `http://localhost:3000`
- Authenticated local Dashboard session
- Playwright CLI responsive smoke at 360px, 390px, and 414px

## Tested Scope

- `/dashboard` existing Dashboard Trust path and Phase 5A history entry point.
- `/dashboard/history` history records from persisted Dashboard decision snapshots.
- Outcome windows for 1 / 5 / 20 trading-day states.
- Ready, pending, and insufficient outcome rendering.
- Mobile layout at 360px, 390px, and 414px.

## Commands And Tools Run

- `pnpm test src/server/dashboard/service.test.ts src/server/dashboard/history-outcomes.test.ts src/server/dashboard/history.test.ts src/components/dashboard/dashboard-history-view.test.ts src/components/dashboard/dashboard-view.test.ts src/components/protected-navigation.test.ts`
- `pnpm check`
- `pnpm build`
- `pnpm dev`
- Playwright CLI smoke against local `/dashboard` and `/dashboard/history`

## Passed Cases

- Targeted tests passed: 6 test files, 26 tests.
- Full local check passed: typecheck, lint, 21 test files, 74 tests.
- Production build passed and included dynamic `/dashboard/history`.
- Local `/dashboard` rendered Dashboard Trust, 今日机会, and the History link.
- Local `/dashboard/history` rendered 17 persisted history records from normalized decision snapshots.
- History page displayed summary and holding records with action, confidence, data quality, basis date, rule version, and generated time.
- Outcome windows rendered pending and insufficient states for recent or missing normalized prices.
- Older local records rendered ready 1D outcome states using normalized daily close data.
- 360px, 390px, and 414px responsive checks on `/dashboard/history` showed no horizontal overflow: `scrollWidth` equaled viewport width.
- 360px responsive check on `/dashboard` showed no horizontal overflow and preserved the History link.

## Failed Cases

- No local product failure confirmed in this run.

## Notes

- Current local normalized data did not naturally contain a Phase 4 available opportunity record; opportunity snapshot persistence is covered by targeted service tests.
- Browser screenshots were captured locally under `output/playwright/` and are not committed.
- No secrets, cookies, provider raw payloads, database URLs, or long logs were recorded.
