# Codex Context Map

This file routes agents to the smallest useful context for each task. Read this file after root `AGENTS.md` and before opening large PRD, phase, QA, bug, or process documents.

## Active State

- Active phase: Phase 2 Dashboard v1 preparation.
- Latest phase plan: `docs/tech/TECH-PLAN-v2026.05.12.md`
- Phase 1 status: complete; configuration page, provider contracts, ingestion, normalized data, and production smoke are done.
- Phase 2 boundary: build Dashboard v1 from normalized data. Do not add AI summaries, news/earnings deep understanding, automatic scheduled jobs, broker sync, real trading, or high-frequency market data.

## Canonical Entrypoints

- Product overview: `docs/prd/PRD-v2026.05.10.md`
- Product delta and future replay/self-improvement notes: `docs/prd/PRD-v2026.05.11.md`
- Current technical plan and acceptance criteria: `docs/tech/TECH-PLAN-v2026.05.12.md`
- Harness Engineering definition: `docs/engineering/HARNESS-ENGINEERING.md`
- Harness feedback loop for agent workflows: `docs/harness-engineering.md`
- QA protocol: `docs/process/QA-AGENT.md`
- Local smoke matrix: `docs/qa/LOCAL-SMOKE.md`
- Current QA regression cases: `docs/qa/ONLINE-QA-REGRESSION-v2026.05.12.md`
- Current open QA issues: `docs/qa/ONLINE-QA-ISSUES-v2026.05.12.md`
- Review protocol: `docs/process/CODE-REVIEW-AGENT.md`
- Review checklist: `docs/review/code_review.md`
- Autonomous ship gate: `docs/process/SHIP-GATE.md`
- Recommended development workflow: `docs/workflows/codex-development-flow.md`

## Acceptance Criteria

For Phase 2 work, use `docs/tech/TECH-PLAN-v2026.05.12.md`:

- Dashboard data service: section 4.1
- Technical indicators: section 4.2
- Macro scoring: section 4.3
- Dashboard UI: section 4.4
- Test strategy: section 5

For Phase 1 fixes, read the directly relevant Phase 1 sections from `docs/tech/TECH-PLAN-v2026.05.11.md` only when the change touches schema, settings, provider contracts, ingestion, production smoke, or data status UI.

## Task Routing

| Task type | Read by default | Read only if needed |
| --- | --- | --- |
| Quick code fix | `AGENTS.md`, this file, directly relevant source/tests | PRD/tech section for phase boundary questions |
| Phase 2 Dashboard implementation | Latest tech plan sections 2-5, relevant PRD sections for Dashboard/product rules | Older tech plans, QA issue history |
| Product/scope decision | PRD v2026.05.10 plus PRD v2026.05.11 delta | Old tech plans |
| Provider/ingestion/schema fix | Latest tech plan, relevant Phase 1 tech plan section, affected source/tests | Full PRD only if behavior scope is unclear |
| Settings UI/auth fix | Latest tech plan, current QA open issues, relevant source/tests | Full QA history |
| QA run | QA protocol, current QA regression doc, current phase plan | Local smoke matrix for development smoke context; historical/resolved bugs only when checking recurrence |
| Code review | Review protocol, review checklist, current diff, relevant phase acceptance criteria | Ship gate only when reviewing ship readiness; full PRD set only for boundary questions |
| Deployment/ops issue | README, latest tech plan section 6, affected config/deploy docs | PRD details |
| Ship/merge/deploy | Ship gate, review protocol, PR checks/status, latest workflow doc | Deployment docs only when deploy behavior is unclear |
| Harness/workflow improvement | This file, root `AGENTS.md`, `docs/harness-engineering.md`, workflow docs, ship gate/local smoke docs when relevant | Business implementation docs |

## Documents To Avoid By Default

- Old phase plans in `docs/tech/` unless the task touches that phase's implementation details.
- Historical or resolved QA bug files unless validating recurrence.
- Full PRD history for narrow code fixes.
- Drizzle snapshots or migrations unless changing schema or investigating migration drift.
- Raw provider payloads and long command logs unless the task specifically requires them.

## QA And Bug Routing

- Current regression cases live in `docs/qa/ONLINE-QA-REGRESSION-v2026.05.12.md`.
- Current open QA issues live in `docs/qa/ONLINE-QA-ISSUES-v2026.05.12.md`.
- Local development smoke coverage lives in `docs/qa/LOCAL-SMOKE.md`.
- Read open bugs when fixing QA findings or validating a release.
- Read resolved or historical bugs only when checking whether a failure is a recurrence.
- Long QA logs should be saved as files and summarized. Prefer `docs/qa/runs/` for QA run summaries or temporary files for disposable raw logs. Do not paste raw logs into the main thread or agent reports.

## Review Routing

- Use `docs/process/CODE-REVIEW-AGENT.md` for review agent operating rules.
- Use `docs/review/code_review.md` for the stable checklist.
- Use `docs/process/SHIP-GATE.md` when a review outcome is being used to approve, merge, deploy, or trigger post-merge QA.
- Reviewers should inspect the diff and directly related contracts/tests, not the entire repository by default.

## Subagent Routing

- Explorer: read-only; finds files, dependencies, risks, and minimal context.
- Reviewer: read-only; reviews diff and checklist compliance.
- QA: read-only or test-only; runs or designs targeted validation.
- Implementation: one writer at a time in a worktree. Use separate worktrees for parallel write scopes.
