# Autonomous Ship Gate

This document turns the ship gate into an executable checklist for Main Agent. Use it when a PR exists and the workflow reaches approve, merge, deploy, or post-merge QA.

## Principle

Do not merge from a feeling that things are probably fine. Merge only after the observable gate is green, or stop with the exact blocker and next action.

## Required Inputs

- PR number, branch, and target branch.
- Reviewer result: no blocking issues, or blocking issues fixed and re-reviewed.
- Local validation result: targeted tests and local smoke, or a clear reason they were skipped.
- Known changed user paths and risk areas.

## Check Order

1. Confirm PR is not draft.
2. Confirm reviewer gate has passed.
3. Confirm local validation and local smoke status are known.
4. Confirm GitHub checks are complete and passing.
5. Confirm Vercel status is visible in GitHub and Ready.
6. Confirm merge state is clean or safely mergeable.
7. Confirm there are no unresolved review threads.
8. Confirm no unresolved secrets, phase-boundary drift, or production-data risk.

If any item is unknown, it is not green. Resolve it, or report it as a blocker.

## Preferred GitHub Checks

Use `gh` first when the token works:

```bash
gh pr view <PR_NUMBER> --json isDraft,mergeStateStatus,reviewDecision,statusCheckRollup
gh pr checks <PR_NUMBER>
```

If review-thread state matters, use GitHub GraphQL through `gh api` or the GitHub connector to inspect unresolved threads.

If `gh` fails because the token is expired, unauthorized, or otherwise unavailable, do not keep retrying the same command. Fall back in this order:

1. GitHub connector, when available.
2. Browser or Chrome view of the PR, when connector access is insufficient.
3. Human handoff only if neither tool path can verify the state.

Record the fallback used in the ship summary.

## Vercel Status

Vercel status is accepted when it is visible from the GitHub PR checks, status rollup, or Vercel bot comment.

Both known Vercel projects must be treated as relevant when they appear in the PR:

- `stock-selection`
- `stock-selection-w5bi`

The deploy state must be Ready or passing. A visible Vercel pending, queued, building, canceled, or failed state blocks shipping.

## Pending Timeout

Pending checks or deploys may be watched for up to 8 minutes.

After 8 minutes:

- Stop waiting.
- Do not merge.
- Report which check or deploy is pending.
- Report the last observed timestamp and the next action, such as wait/retry later, inspect CI logs, inspect Vercel, or ask for user intervention.

If the pending item later turns green, rerun the ship gate from the relevant check step instead of assuming the old gate still holds.

## Merge Action

When every gate item is green, Main Agent may:

- Submit approval if GitHub permits it.
- Merge using the repository's normal merge strategy.
- Let Vercel production deploy trigger automatically from the merge.
- Check the deploy result when available.
- Trigger post-merge targeted QA with a compact handoff packet.

If GitHub disallows formal self-approval but branch protection still permits merge, record that the ship gate passed and continue. If branch protection requires an approval the agent cannot provide, stop and report the blocker.

## Post-Merge Deploy Gate

After merge:

- Confirm Vercel production deploy is Ready before formal post-merge QA.
- If deploy is pending for more than 8 minutes, stop and report it as a deploy blocker.
- If deploy fails, do not run formal QA. Fix or report the deploy failure first.

## Ship Summary

The final ship summary must include:

- PR and branch.
- Reviewer result.
- Checks result, including Vercel.
- Local validation and smoke result.
- Any fallback used because `gh` was unavailable.
- Merge/deploy result.
- QA handoff or reason QA did not run.
