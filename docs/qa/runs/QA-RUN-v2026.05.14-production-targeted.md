# QA Run: Phase 2.1 Production Targeted QA

Date: 2026-05-14

Environment:

- Production `https://stock-selection-pi.vercel.app`
- Chrome browser automation for login, protected routes, Dashboard, and Settings form clicks
- Shell HTTP checks for `/api/health`
- Direct Neon queries only for explicit QA test-record cleanup and verification after browser native confirmation blocked automation

## Tested Scope

- Auth login failure, login success, logout redirect, protected route access, and `/settings` `next` return.
- Dashboard routes `/` and `/dashboard`.
- Settings add and save flows for holdings, watchlist items, and key price levels.
- Settings preferences save.
- Settings data refresh.
- Provider and health status visibility without secret leakage.
- Numeric constraint presence in production HTML for cost basis, priority, key price, and short-term window fields.

## Test Data

- Holding: `QAH0987`
- Watchlist item: `QAW0987`
- Key price level: `QAK0987`

All three records were created through production Settings forms. Browser automation later hit a native confirmation-dialog limitation while testing deactivate. The records were then soft-deactivated by exact symbol, one record type at a time, and verified inactive through direct database queries. No bulk deletion was performed.

## Commands And Tools Run

- Chrome browser automation against production UI.
- `curl -fsS https://stock-selection-pi.vercel.app/api/health`
- Node/Neon read-only query for the three explicit QA symbols.
- Node/Neon exact-symbol soft-deactivate cleanup for `QAH0987`, `QAW0987`, and `QAK0987`.
- Node/fetch production `/api/login` plus `/settings` HTML check for numeric field attributes.

## Passed Cases

- Wrong password stays on `/login` and shows `密码不正确。`
- Logged-out `/settings` redirects to `/login?error=auth-required&next=%2Fsettings`.
- Correct login from that path returns to `/settings`.
- Logged-in `/`, `/dashboard`, `/settings`, and `/health` do not bounce to login.
- `/` and `/dashboard` render Dashboard v1 and do not show Phase 0 copy or 404.
- `/api/health` returns `status: ok`, production runtime, database `ok`, required Phase 1/2 env checks true, and `OPENAI_API_KEY` false as expected for current scope.
- Adding holding `QAH0987` stays on `/settings` and the record appears.
- Saving holding `QAH0987` stays on `/settings`; reload/DOM snapshot confirmed saved textarea value.
- Adding watchlist item `QAW0987` stays on `/settings` and the record appears.
- Saving watchlist item `QAW0987` stays on `/settings`; reload confirmed saved theme/notes.
- Adding key price level `QAK0987` stays on `/settings` and the record appears.
- Saving key price level `QAK0987` stays on `/settings`; reload/DOM snapshot confirmed saved textarea value.
- Saving 基础偏好 stays on `/settings` and the section remains readable after reload.
- Clicking 刷新数据 stays on `/settings`; provider states remain readable and no secrets are displayed. The run showed `部分成功`, `3/5 成功`, `2 失败`, and `95 行入库`.
- Production `/settings` HTML exposes numeric constraints and helper text: `costBasis min=0.0001`, `priority min=0 max=100`, `price min=0.0001`, `shortTermWindowDays min=1 max=5`, plus `需大于 0`, `0 到 100`, and `1 到 5`.
- QA test records were soft-deactivated and verified inactive.

## Limited Coverage

- Deactivate UI confirmation: clicking the production `停用` button opened a browser-native confirmation path and blocked the Chrome automation channel. This confirms the destructive action is guarded, but the cancel branch and confirm branch were not fully verified through browser automation.
- Mobile production viewport: not completed in production because the browser automation channel became blocked by the native confirmation dialog before responsive viewport checks could be run. Local Phase 2.1 smoke already passed at 360px, 390px, and 414px.

## Failed Cases

- No product failure was confirmed in the covered paths.
- Coverage gaps remain for production mobile viewport and production deactivate cancel/confirm branches.

## Related Issues

- QA-001: Partial production pass. Add/save/refresh no longer bounce to login; deactivate submit after confirm still needs manual or controllable-browser production retest.
- QA-002: Still fixed pending production mobile retest.
- QA-003: Closed.
- QA-004: Closed.
- QA-005: Still fixed pending production cancel/confirm retest.
- QA-006: Closed.
- QA-007: Closed.

## Next Action

- Run a short manual or controllable-browser production retest for `停用` cancel/confirm on one explicit test record.
- Run production responsive smoke at 390px, with 360px and 414px preferred.
- If those pass, close QA-001, QA-002, and QA-005 and mark Phase 2.1 complete.
