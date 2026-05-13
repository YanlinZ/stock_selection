# Code Review Checklist

Use this checklist for reviewer agents and human review. Review the relevant diff, directly related contracts/tests, and current phase acceptance criteria. Do not default to scanning every historical document.

## Scope And Contracts

- Current phase boundary is respected.
- No hidden expansion into broker sync, real trading, push notifications, high-frequency data, full-market recommendations, or AI summaries.
- API contracts and public interfaces are unchanged, or the change is intentional and documented.
- Backend validation covers malformed, missing, stale, duplicate, and unauthorized inputs.
- Raw provider data remains separated from normalized application data.

## Data And Security

- No API key, token, password, database URL, cookie, or secret is logged, displayed, committed, or embedded in fixtures.
- Auth and permission checks still protect server actions, routes, and pages.
- Database schema or migration changes are reviewed for rollback, idempotency, and production data risk.
- Provider/ingestion changes remain observable through raw response records, normalized rows, run status, and safe error messages.

## Frontend Behavior

- Loading, empty, stale, and error states are clear.
- User-facing trading guidance includes reasons, risks, and data date.
- Forms preserve user context after submit and surface validation failures.
- Mobile layout remains usable at narrow widths.
- Basic accessibility is preserved: labels, button purpose, focus, and readable contrast.

## Tests And Regression

- Targeted tests cover the changed behavior and highest-risk edge cases.
- Existing provider contract, fixture, ingestion, auth, or Dashboard tests still pass when relevant.
- QA cases are updated when a user-facing regression is fixed or discovered.
- Repeated failures are converted into a test, lint rule, script check, review checklist item, QA case, or phase acceptance criterion.

## Operational Risk

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, or `pnpm check` results are known for risky changes.
- Build/deploy requirements and environment variables are unchanged or documented.
- Long logs are stored as files and summarized.
- Residual risks and skipped validations are explicitly stated.
