# QA Run: Phase 5B Plan Status Tracking Local

Date: 2026-05-16

Environment:

- Local branch `codex/phase-5b-plan-status`, followed by basis-date guard fix branch validation
- Local dev server at `http://localhost:3000`
- `pnpm dev`
- Browser plugin and Playwright CLI smoke attempted

## Tested Scope

- Phase 5B plan status pure calculation.
- Current Dashboard target snapshot `planStatus`.
- Historical judgment entry `planStatus`.
- Dashboard and history static markup for plan status content.
- Phase boundary guard against review conclusions such as success/failure or rule-valid/rule-invalid wording.

## Commands And Tools Run

- `pnpm test src/server/dashboard/plan-status.test.ts src/server/dashboard/service.test.ts src/server/dashboard/history.test.ts src/components/dashboard/dashboard-view.test.ts src/components/dashboard/dashboard-history-view.test.ts`
- `pnpm check`
- `pnpm build`
- `pnpm dev`
- Browser plugin attempt against `/dashboard`
- Playwright CLI attempt against `/dashboard` and `/dashboard/history`

## Passed Cases

- Targeted Phase 5B tests passed after the basis-date guard fix: 5 files, 29 tests.
- Full local check passed after the basis-date guard fix: typecheck, lint, and 22 Vitest files / 82 tests.
- Next production build passed and included `/dashboard` and `/dashboard/history`.
- Static markup tests confirmed Dashboard and History render `计划状态` and `已触发`.
- History UI test confirmed no `成功`、`失败`、`规则有效`、`规则无效` review conclusions are rendered.
- Playwright CLI fallback completed 390px local smoke for `/dashboard`.
- Playwright CLI fallback completed 390px local smoke for `/dashboard/history`.
- Local 390px smoke confirmed both pages rendered Phase 5B and `计划状态`.
- Local 390px smoke showed no horizontal overflow on both pages.
- Local console checks reported 0 warnings and 0 errors on both pages.

## Failed Or Blocked Cases

- Browser plugin could not open `localhost` or `127.0.0.1` local dev URLs; it reported client-side blocking for the local target.
- Playwright CLI fallback failed in sandbox because npm registry access was blocked.
- Escalated Playwright CLI fallback was rejected by the permissions reviewer because it would combine elevated npm-fetched third-party code with local auth secret access.
- A later local smoke used the already installed Playwright CLI binary, so local browser smoke and 390px overflow checks were completed without npm registry access.

## Notes

- The earlier browser/plugin failures were tooling limitations, not product failures.
- No secrets, cookies, provider raw payloads, database URLs, or long logs were recorded.
- Production/browser QA was recorded separately in `docs/qa/runs/QA-RUN-v2026.05.16-phase-5b-production.md`.
