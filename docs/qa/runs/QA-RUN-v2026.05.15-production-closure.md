# QA Run: Phase 2.1 / Phase 3 Production Closure

Date: 2026-05-15

Environment:

- Production `https://stock-selection-pi.vercel.app`
- PR #31 merged to `main` at `3e3a5a96faae4166e5c7323dd6979dfad7e57344`
- Vercel deployment checks passed for `stock-selection` and `stock-selection-w5bi`
- Headless Chrome responsive smoke for mobile navigation
- Chrome browser automation and production form submission for explicit deactivate retest
- Direct Neon read-only verification for the explicit QA holding after deactivate

## Tested Scope

- Phase 3 Dashboard Trust production smoke on `/dashboard`.
- Phase 3 Drizzle migration application for `dashboard_decision_snapshots`.
- QA-001 production deactivate submit path for Settings.
- QA-002 production mobile navigation at 390px, 360px, and 414px.
- QA-005 production deactivate cancel and accepted deactivate paths.

## Test Data

- Holding: `QH388421`

The holding was created through the production Settings UI for this retest. It was soft-deactivated through the exact production deactivate form for that record and verified inactive. No bulk deletion or batch cleanup was performed.

## Commands And Tools Run

- `pnpm check`
- `pnpm db:migrate`
- `gh pr view 31 --json number,state,mergedAt,mergeCommit,headRefName,baseRefName,title,url`
- `gh pr checks 31`
- Chrome browser automation against production `/dashboard` and `/settings`
- Headless Chrome responsive smoke at 390px, 360px, and 414px
- Production `/api/login` plus exact Settings deactivate form submission for `QH388421`
- Direct Neon read-only verification for `QH388421`

## Passed Cases

- PR #31 is merged and both Vercel deployment checks passed.
- `pnpm check` passed: typecheck, lint, 17 test files, 55 tests.
- `pnpm db:migrate` applied the Phase 3 migration successfully.
- Production `/dashboard` stayed authenticated and rendered Dashboard Trust UI.
- Production Dashboard displayed confidence labels, data-quality labels, and support/opposition/risk/missing evidence groups.
- Deactivate cancel branch passed for `QH388421`: Escape/cancel preserved the record and stayed off `/login`.
- Deactivate accepted path passed for `QH388421`: exact production deactivate form submission removed the record from Settings and DB verification showed `is_active=false`.
- Production mobile navigation passed at 390px, 360px, and 414px: Settings, Health, and 退出 were visible, in viewport, and no horizontal overflow was measured.

## Failed Cases

- No product failure confirmed in this closure run.

## Notes

- The Chrome extension wrapper still does not expose Playwright `dialog` accept/dismiss APIs. Cancel was verified through the real native dialog with Escape. The accepted deactivate path was verified by submitting the exact production form for the same explicit record after the guard had already been proven present.
- No secrets, cookies, raw provider payloads, or database URLs were recorded.

## Related Issues

- QA-001: Closed.
- QA-002: Closed.
- QA-005: Closed.

## Next Action

- Phase 2.1 production closure is complete.
- Phase 3 Dashboard Trust is deployed and production-smoked.
- Next development phase can proceed to a separately scoped Dashboard/Settings MVP extension.
