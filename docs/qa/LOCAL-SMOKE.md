# Local Smoke Matrix

Use this matrix during implementation before review or merge. It is intentionally narrower than formal QA: run only the rows touched by the change, plus any prerequisite auth path needed to reach them.

Local smoke catches browser, route, form, server action, session, and layout breakage that unit tests do not reliably catch.

## Rules

- Main Agent owns local smoke.
- Prefer the local app with `.env.local`; never print secrets.
- Use a real browser path for user flows when practical.
- Do not replace form or server action smoke with raw API or HTML reads.
- If browser automation is blocked, say exactly which interaction was not covered.
- Save long logs outside the main thread and summarize the result.

## Matrix

| Change touches | Minimum local smoke |
| --- | --- |
| Protected layout, auth cookie, login, logout, redirects | Open `/login`, verify wrong password stays on login, verify correct password enters the app, refresh the protected page, open `/settings` directly, logout, verify protected content is not visible. |
| `next` redirect handling | While logged out, open `/settings` and `/health`; after login, verify the app returns to the original path. Verify external `next` values do not leave the app when this code path changed. |
| Settings holdings form or server action | Log in, open `/settings`, add a test holding, save it, refresh, then deactivate only the explicit test record if cleanup is authorized. Confirm the page stays on `/settings` after each submit. |
| Settings watchlist form or server action | Log in, open `/settings`, add a test watchlist item, save it, refresh, then deactivate only the explicit test record if cleanup is authorized. Confirm the page stays on `/settings` after each submit. |
| Settings key price form or server action | Log in, open `/settings`, add a test key price level, save it, refresh, then deactivate only the explicit test record if cleanup is authorized. Confirm the page stays on `/settings` after each submit. |
| Any destructive or soft-delete UI | Confirm there is a confirmation, clear consequence, or documented no-confirmation decision. Cancel once when a confirmation exists, then confirm on an explicit test record only. |
| Data refresh, provider adapter, ingestion, or provider status UI | Log in, open `/settings`, trigger refresh only when safe for the target environment, verify the batch status is visible, provider success/failure/not-run states are understandable, and no secret is displayed. |
| `/health` or `/api/health` | Open `/health` and request `/api/health`; verify database status, required env presence, and current phase expectations without exposing actual secret values. |
| Home page or Dashboard UI | Log in, open `/`; verify the phase/state is current, empty or insufficient data does not crash, stale/unavailable states are explicit, and trading guidance includes reason, risk, and data date when guidance is present. |
| Dashboard data service, indicators, macro scoring, or normalized data reads | Run targeted unit tests for no data, stale data, and normal data. If UI changed, also open `/` and verify Dashboard output is based on normalized data, not provider raw payloads. |
| Navigation or responsive layout | Check desktop and a narrow mobile viewport, at least 390px. Confirm `Settings`, `Health`, and logout remain reachable and content does not horizontally overflow. |
| Styling-only visible UI change | Open the changed route at desktop and 390px width. Confirm readable text, stable layout, and no obvious console error if a browser tool is available. |
| Docs-only change | No browser smoke required unless the docs change modifies workflow instructions for QA, review, deploy, or local smoke itself. |

## Reporting

In the final implementation summary, include:

- Smoke rows run.
- Environment used: local app, preview, production, or skipped.
- Result.
- Any skipped row and why.
- Any follow-up QA case needed.
