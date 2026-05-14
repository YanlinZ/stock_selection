# QA Run: Phase 2.1 Local Hardening

Date: 2026-05-14

Environment:

- Local Next dev server with `.env.local`
- Local HTTP smoke against `http://127.0.0.1:3000`
- Chrome and Codex in-app browser for local UI smoke

## Tested Scope

- Auth login failure, login success, logout, protected route redirect, safe `next` return to `/settings`.
- Settings server action auth fallback for cookie header and bound action token.
- Settings holding add/save flow staying on `/settings`.
- Settings native deactivate confirmation presence.
- Settings 基础偏好 section and numeric constraints/helper text.
- Dashboard routes `/` and `/dashboard`.
- Mobile navigation at 360px, 390px, and 414px.

## Commands Run

- `pnpm test src/lib/http.test.ts src/lib/auth/session.test.ts src/app/api/login/route.test.ts 'src/app/(protected)/layout.test.ts' src/app/logout/route.test.ts src/components/protected-navigation.test.ts 'src/app/(protected)/settings/actions.test.ts' src/proxy.test.ts`
- `pnpm test src/server/config/service.test.ts src/server/ingestion/service.test.ts src/server/dashboard/service.test.ts src/components/dashboard/dashboard-view.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm check`
- `pnpm build`
- Local HTTP smoke script for auth redirects, login, protected routes, `/`, `/dashboard`, `/settings`, and `/health`.

## Passed Cases

- Wrong password stays on login and shows the expected error.
- Logged-out `/settings` redirects to `/login?error=auth-required&next=%2Fsettings`.
- Correct login returns to `/settings`.
- Protected `/`, `/dashboard`, `/settings`, and `/health` return 200 with a valid access cookie.
- `/` and `/dashboard` render Dashboard v1 content and do not show Phase 0 copy.
- Browser Settings smoke added and saved explicit test holding `ZZZCODX34540501` without leaving `/settings`.
- Test holding `ZZZCODX34540501` was deactivated with a single explicit cleanup update.
- Settings page exposes 基础偏好 and `保存偏好`.
- Cost basis and key price fields use a positive minimum aligned with server validation and show `需大于 0`.
- Priority field exposes `0 到 100`; short-term window exposes `1 到 5`.
- In-app browser responsive smoke passed at 360px, 390px, and 414px: Settings, Health, and logout links were present and visible.

## Limited Coverage

- Chrome automation clicked the holding `停用` button and hit the native confirmation dialog, which blocked the browser automation channel before it could accept/cancel the dialog. This confirms the destructive action is guarded by a browser-native confirmation, but the cancel/confirm branches still need production targeted QA or manual browser verification.
- Production targeted QA is pending until this branch is merged and the deployment is ready.

## Related Issues

- QA-001: Fixed pending production retest.
- QA-002: Fixed pending production retest.
- QA-003: Fixed pending production retest.
- QA-004: Fixed pending production retest.
- QA-005: Fixed pending production/manual confirmation retest.
- QA-006: Fixed pending production retest.
- QA-007: Fixed pending production retest.

## Next Action

- PR #28 merged on 2026-05-14 at 05:07:52 UTC, and Vercel deployment checks for `stock-selection` and `stock-selection-w5bi` passed.
- Production targeted QA run recorded in `docs/qa/runs/QA-RUN-v2026.05.14-production-targeted.md`.
- Remaining follow-up: short production retest for deactivate confirm/cancel and mobile navigation before closing QA-001, QA-002, and QA-005.
