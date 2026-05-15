# QA Run: Phase 4 Watchlist Opportunity Scan Local

Date: 2026-05-15

Environment:

- Local branch `codex/phase-4-watchlist-opportunity`
- Local Next.js dev server `http://localhost:3000`
- Authenticated local Dashboard session
- In-app browser responsive smoke at 360px, 390px, and 414px

## Tested Scope

- Phase 4 Dashboard opportunity summary on `/dashboard`.
- No-opportunity state with trust metadata, evidence groups, data-quality label, and data sources.
- Mobile layout and protected navigation visibility at 360px, 390px, and 414px.
- Service/UI unit coverage for one opportunity, no opportunity, multiple candidates, weak single-signal exclusion, elevated macro hard exclusion, both-role dedupe, partial data downgrade, indicators, and macro scoring.

## Commands And Tools Run

- `pnpm test src/server/dashboard/service.test.ts src/server/dashboard/indicators.test.ts src/server/dashboard/macro-scoring.test.ts src/components/dashboard/dashboard-view.test.ts`
- `pnpm check`
- `pnpm dev`
- In-app browser smoke against local `/dashboard`

## Passed Cases

- Targeted tests passed: 4 test files, 19 tests.
- Full local check passed: typecheck, lint, 17 test files, 61 tests.
- Local `/dashboard` rendered Phase 4, Dashboard Trust, and 今日机会.
- Current local data produced the safe no-opportunity state: 今日无高质量关注机会，保持观察.
- Opportunity section displayed confidence, data-quality, support/opposition/risk/missing evidence groups, and data source/update metadata.
- 360px, 390px, and 414px responsive checks showed no horizontal overflow: `scrollWidth` equaled viewport width.
- Settings, Health, and logout links existed and remained within viewport at 360px, 390px, and 414px.

## Failed Cases

- No local product failure confirmed in this run.

## Notes

- The current local normalized data naturally covered the no-opportunity Dashboard state. Candidate, multi-candidate, stale/partial, macro-risk, and both-role paths are covered by targeted service/UI tests.
- No secrets, cookies, provider raw payloads, or database URLs were recorded.
