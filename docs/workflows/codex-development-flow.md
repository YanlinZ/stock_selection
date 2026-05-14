# Codex Development Flow

Use this workflow to keep the main thread small, avoid agent conflicts, and make each phase easier to finish.

## Default Model

- Main thread is the default implementation owner.
- Planner agent is the read-only planning gate whenever the workflow needs to decide next development work for medium, large, phase, cross-module, or ambiguous follow-up tasks. Use `docs/process/PLANNER-AGENT.md`.
- Local development smoke checks happen before review and merge when a change affects browser-visible behavior. Use `docs/qa/LOCAL-SMOKE.md`.
- Code review is the main pre-merge gate for medium, phase, and high-risk changes.
- Main agent is the ship executor: after reviewer gate passes and PR checks are all green, it can apply `docs/process/SHIP-GATE.md`, approve/merge, rely on Vercel auto-deploy, and trigger QA.
- Formal browser QA usually runs after merge/deploy, because production or preview testing may require merged code.
- QA should be targeted by default. Use full regression only for phase completion, release candidates, or high-risk changes.

## Small Tasks

Use for narrow fixes, typo-level docs edits, and single-file low-risk changes.

1. Main agent reads `AGENTS.md` and `docs/context-map.md`.
2. Open only the directly relevant source or doc.
3. Make the change in the main thread.
4. Run targeted validation, or explain why none is needed.
5. Run the relevant local smoke rows from `docs/qa/LOCAL-SMOKE.md` only if the change affects a visible route, form, auth flow, or server action.
6. Final summary stays short and includes files changed plus validation.

Do not start QA or review agents unless the change touches auth, schema, provider, ingestion, server actions, secrets, deployment, data status UI, or core business rules.

## Medium Tasks

Use for multi-file features or fixes with moderate risk.

1. Planner agent creates the next-work plan with scope, ordered steps, validation, risks, and handoff using `docs/process/PLANNER-AGENT.md`.
2. Explorer agent performs read-only discovery only when the planner or main thread finds the touched area unfamiliar, cross-module, or phase/risk boundaries are unclear.
3. Main thread writes the change unless there is a clear reason to use a separate implementation owner.
4. Run targeted tests first.
5. Run local development smoke for affected browser flows when relevant, using `docs/qa/LOCAL-SMOKE.md`.
6. Reviewer agent performs read-only diff review using `docs/review/code_review.md`.
7. Main thread fixes blocking issues and reruns relevant checks.
8. Main agent applies `docs/process/SHIP-GATE.md` when a PR exists.
9. After merge/deploy, run post-merge targeted QA only for user-facing, auth, data, provider, deployment, or workflow-sensitive changes.

Keep one writer per worktree. Reviewer and explorer do not edit files.

## Large Tasks / Phase Tasks

Use for phase implementation, large UI flows, schema/data changes, or high-regression-risk work.

1. Main agent reads `docs/context-map.md`.
2. Planner agent creates the phase/large-task plan with scope, acceptance criteria, validation, risks, and agent handoff using `docs/process/PLANNER-AGENT.md`.
3. Explorer agent maps relevant files, dependencies, and risks without editing when the planner identifies unfamiliar or high-risk boundaries.
4. Main agent accepts or adjusts the plan, then records the execution plan before implementation.
5. A single implementation owner writes code in the current worktree, or each writer uses a separate worktree with disjoint file ownership.
6. Run targeted tests while implementing.
7. Run local development smoke for affected browser flows before review, using `docs/qa/LOCAL-SMOKE.md`.
8. Reviewer agent checks the diff and risk areas as the pre-merge gate.
9. Main thread fixes blocking issues and reruns relevant checks.
10. Main agent applies `docs/process/SHIP-GATE.md`.
11. Vercel deploys automatically after merge; Main agent checks deploy status when available.
12. QA agent runs post-merge targeted QA against current phase cases.
13. Run lint/typecheck/tests appropriate to the risk if they were not already run before merge.
14. Convert repeated failures into tests, QA cases, checklist items, scripts, or context-map routing.

## Autonomous Ship Gate

Main agent is authorized to ship a PR without asking again when all gate conditions are met. The executable protocol lives in `docs/process/SHIP-GATE.md`.

- Reviewer agent reports no blocking issues, or blocking issues were fixed and re-reviewed.
- PR is not draft.
- All required PR checks are passing.
- No checks are pending.
- No checks are failing.
- Vercel preview/deploy checks required for the PR are passing.
- Merge state is clean or safely mergeable.
- There are no unresolved review threads.
- Targeted validation and local dev smoke results are known, or skipped with a clear reason.
- No secrets, phase-boundary drift, or production-data risk is unresolved.
- No check or deploy has been pending for more than 8 minutes.

When the gate passes, Main agent may:

- Submit approval if GitHub permits it.
- Merge using the repo's default merge strategy.
- Let Vercel production deploy trigger automatically from the merge.
- Check deploy status when available.
- Trigger post-merge targeted QA with a handoff packet.

When the gate does not pass, Main agent must stop shipping and report the blocker plus the next action. If `gh` cannot verify the gate because its token is expired or unavailable, fall back to the GitHub connector, then browser/Chrome PR inspection, and record the fallback. If GitHub disallows formal self-approval but branch protection still allows merge, record that the ship gate passed and continue. If branch protection requires an approval the agent cannot provide, stop and report the blocker.

## QA Handoff Packet

After deploy succeeds, Main agent should pass this compact context to QA:

- PR, branch, commit, and deploy URL.
- Changed user paths and out-of-scope areas.
- Reviewer result and remaining non-blocking risks.
- Checks and local smoke results.
- QA level: post-merge targeted QA or full regression.
- Specific cases to prioritize from `docs/qa/`.

## Fix Loop

When QA finds a failure:

- If several next actions are plausible, Planner agent ranks the next development loop before Main Agent starts implementation.
- P0/P1: Main agent fixes in a new loop, reruns targeted validation/local smoke, asks reviewer for re-review when risk warrants it, ships through the same gate, then triggers targeted QA re-test.
- P2/P3: Main agent fixes in the same loop only when it is low-risk and clearly in scope; otherwise record it as follow-up.
- Repeated failures become a test, QA case, review checklist item, script check, or context-map route.

## QA Levels

### Local Dev Smoke

Use during implementation before review or merge.

- Owner: main agent.
- Environment: local app, local browser, or narrow command-level verification.
- Scope: only the route, form, server action, layout, or data path affected by the change.
- Goal: catch obvious breakage before reviewer or post-merge QA time is spent.
- Matrix: `docs/qa/LOCAL-SMOKE.md`.

### Post-Merge Targeted QA

Use after merge/deploy when browser testing depends on preview or production code.

- Owner: QA agent or main agent acting in QA mode.
- Environment: deployed preview or production, depending on the request.
- Scope: changed user paths plus current phase critical paths.
- Goal: verify the merged behavior works in the real target environment.

### Full Regression

Use only for release candidates, phase completion, risky auth/schema/provider/deployment changes, or when the user explicitly asks for full QA.

- Owner: QA agent.
- Environment: normally production or release candidate preview.
- Scope: current QA regression document plus any open issue recurrences.
- Goal: build release confidence, not support every small development iteration.

## Parallel Development And Worktrees

Parallel writing tasks should use git worktrees or independent branches.

Example:

```bash
git worktree add ../stock-selection-phase-dashboard -b codex/phase-dashboard
git worktree add ../stock-selection-phase-qa -b codex/phase-qa
git worktree add ../stock-selection-review -b codex/review
```

Rules:

- One writing agent per worktree.
- QA and reviewer agents are read-only or test-only by default.
- Merge serially, not concurrently.
- After each merge, run relevant lint/typecheck/tests.
- Do not let multiple agents in the same directory modify the same files.

This repo is small enough that many tasks should stay in one worktree. Use worktrees when parallel writers would otherwise touch overlapping files or block each other.

## Long Logs

- Redirect long command output to a log file when possible. QA summaries can live in `docs/qa/runs/`; disposable raw logs can live in a temporary file.
- Summarize only the command, failure class, key lines, and log path.
- Do not paste raw CI, browser, provider, or test logs into the main thread.
- If a log includes secrets or credentials, stop and sanitize before sharing any summary.

## Stuck Or Slow Checklist

When Codex feels stuck, slow, or "almost dead", check:

- Is the thread too long and should it compact or restart with `docs/context-map.md`?
- Is a subagent waiting for approval?
- Is the workflow missing a Planner Agent pass for the next development step?
- Is fan-out too high for the task?
- Are multiple agents writing the same files?
- Should parallel writers be split into worktrees?
- Did an agent read every historical PRD, phase plan, QA issue, or bug doc?
- Did raw logs flood the thread?
- Is high reasoning being used for a simple task?
- Are test commands unclear or missing?
- Is the local environment setup incomplete?
- Is a network/deploy command waiting on approval?
- Has a PR check or Vercel deploy been pending for more than 8 minutes?

When in doubt, shrink context first, reduce concurrency second, and make the next validation command explicit.

If the same failure repeats twice without a new hypothesis, stop rerunning it. Write down the hypothesis, evidence, and the next smallest validation command. If the pattern repeats across tasks, move it into the Harness Engineering feedback loop.
