# QA Run: Phase 5A History Judgment And Performance Tracking Production

Date: 2026-05-16

Environment:

- Production URL `https://stock-selection-pi.vercel.app`
- Merge commit `d03a08437ae21abace9fe39191f2433017c28c84`
- PR #40 merged into `main`
- Vercel production checks for `stock-selection` and `stock-selection-w5bi`
- Authenticated production Dashboard session
- Playwright CLI smoke at desktop width and 390px mobile width

## Tested Scope

- Production `/dashboard` after merge/deploy.
- Production `/dashboard/history` Phase 5A history page.
- Existing Dashboard Trust and Phase 4 opportunity/no-opportunity path.
- History records, outcome windows, pending/insufficient/ready states, and mobile overflow.

## Commands And Tools Run

- `gh pr view 40 --json state,mergedAt,mergeCommit,url`
- `gh api repos/yanlin-zhou/stock-selection/commits/d03a08437ae21abace9fe39191f2433017c28c84/status`
- Playwright CLI smoke against production `/dashboard` and `/dashboard/history`

## Passed Cases

- PR #40 merged at `2026-05-16T20:22:09Z`.
- Vercel production statuses passed for both `stock-selection` and `stock-selection-w5bi`.
- Production `/dashboard` rendered Dashboard Trust, Phase 5A label, 今日机会, and the History link.
- Production `/dashboard/history` rendered 17 persisted history records.
- History entries displayed scope, symbol, action, confidence, data quality, basis date, rule version, and generated time.
- Outcome windows displayed pending and insufficient states for recent or missing normalized prices.
- Older production records displayed ready 1D outcome states using normalized daily close data.
- 390px responsive check on production `/dashboard/history` showed no horizontal overflow: `scrollWidth` equaled viewport width.

## Failed Cases

- No production product failure confirmed in this run.

## Notes

- Current production normalized data naturally covered no-opportunity Dashboard state and history records with pending, insufficient, and ready 1D outcomes.
- No secrets, cookies, provider raw payloads, database URLs, or long logs were recorded.
