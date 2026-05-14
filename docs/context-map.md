# Codex Context Map

This file routes agents to the smallest useful context for each task. Read this file after root `AGENTS.md` and before opening large PRD, phase, QA, bug, or process documents.

## Active State

- Active state: Phase 3 Dashboard Trust is implemented in the current codebase: holdings now include trust tags, source/update metadata, support/opposition/risk/missing evidence groups, confidence/data-quality labels, and lightweight daily decision snapshots. Phase 2 Dashboard v1 and Phase 2.1 local hardening are complete and merged. Production targeted QA partially passed: QA-003, QA-004, QA-006, and QA-007 are closed; QA-001, QA-002, and QA-005 remain fixed pending later production retest for deactivate confirm/cancel and mobile navigation.
- Latest phase plan: `docs/tech/TECH-PLAN-v2026.05.14-phase-3-dashboard-trust.md`
- Latest hardening plan: `docs/tech/TECH-PLAN-v2026.05.14-phase-2.1-hardening.md`
- Latest completed technical status: `docs/tech/TECH-PLAN-v2026.05.14.md`
- Phase 1 status: complete; configuration page, provider contracts, ingestion, normalized data, and production smoke are done.
- Phase 2 result: Dashboard v1 reads normalized data and outputs rule-based, explainable daily guidance with reasons, risks, data dates, macro scoring, technical indicators, and key price level proximity.
- Phase 3 result: Dashboard Trust for Holdings Decisions strengthens holding action trust with source/update metadata, support/opposition/risk/missing evidence groups, confidence/data-quality tags, and lightweight daily decision snapshots.
- Current boundary: do not add AI summaries, news/earnings deep understanding, automatic scheduled jobs, broker sync, real trading, push notifications, high-frequency market data, or full-market recommendations unless explicitly requested.

## Canonical Entrypoints

- Product overview: `docs/prd/PRD-v2026.05.10.md`
- Product delta and future replay/self-improvement notes: `docs/prd/PRD-v2026.05.11.md`
- Next phase plan and acceptance criteria: `docs/tech/TECH-PLAN-v2026.05.14-phase-3-dashboard-trust.md`
- Phase 2.1 hardening plan and acceptance criteria: `docs/tech/TECH-PLAN-v2026.05.14-phase-2.1-hardening.md`
- Current completed technical status: `docs/tech/TECH-PLAN-v2026.05.14.md`
- Phase 2 implementation plan/history: `docs/tech/TECH-PLAN-v2026.05.12.md`
- Harness Engineering definition: `docs/engineering/HARNESS-ENGINEERING.md`
- Harness feedback loop for agent workflows: `docs/harness-engineering.md`
- QA protocol: `docs/process/QA-AGENT.md`
- Planner protocol: `docs/process/PLANNER-AGENT.md`
- Local smoke matrix: `docs/qa/LOCAL-SMOKE.md`
- Current QA regression cases: `docs/qa/ONLINE-QA-REGRESSION-v2026.05.12.md`
- Current open QA issues: `docs/qa/ONLINE-QA-ISSUES-v2026.05.12.md`
- Latest production QA run: `docs/qa/runs/QA-RUN-v2026.05.14-production-targeted.md`
- Review protocol: `docs/process/CODE-REVIEW-AGENT.md`
- Review checklist: `docs/review/code_review.md`
- Autonomous ship gate: `docs/process/SHIP-GATE.md`
- Recommended development workflow: `docs/workflows/codex-development-flow.md`

## Acceptance Criteria

For Phase 3 Dashboard Trust implementation, use `docs/tech/TECH-PLAN-v2026.05.14-phase-3-dashboard-trust.md` first:

- Planner gate: section 0
- Technical discovery: section 1
- In scope / out of scope: sections 3 and 4
- Recommended implementation order: section 5
- Acceptance criteria: section 6
- Validation plan: section 7
- Done criteria: section 9

For Phase 2.1 post-merge hardening or QA reconciliation, use `docs/tech/TECH-PLAN-v2026.05.14-phase-2.1-hardening.md` first:

- QA issue exit standards: section 6
- Validation plan: section 7
- Done criteria: section 9
- Current next-step handoff: section 11

For Phase 2 Dashboard maintenance or follow-up work, use `docs/tech/TECH-PLAN-v2026.05.14.md` first. Original Phase 2 implementation acceptance criteria remain in `docs/tech/TECH-PLAN-v2026.05.12.md`:

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
| Phase 2.1 hardening / QA issue reconciliation | Phase 2.1 hardening plan, current QA open issues, local smoke matrix, directly relevant auth/settings/Dashboard source/tests | Older phase plans only when a fix depends on their implementation details |
| Phase 3 Dashboard Trust implementation | Phase 3 plan, latest tech status, directly relevant Dashboard source/tests, schema/migration files if snapshots are touched | PRD v2026.05.11 decision snapshot notes only when scope questions arise |
| Phase 2 Dashboard maintenance/follow-up | Latest tech status, directly relevant Dashboard source/tests, relevant PRD sections for Dashboard/product rules | Original Phase 2 implementation plan, older tech plans, QA issue history |
| Product/scope decision | PRD v2026.05.10 plus PRD v2026.05.11 delta | Old tech plans |
| Next development planning | Planner protocol, latest tech status, Phase 3 plan, directly relevant PRD/QA/review inputs | Old phase plans only when the plan depends on their implementation details |
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

- Planner: read-only; plans next development work, scope, validation, risks, and handoff before medium/large/phase or ambiguous follow-up tasks.
- Explorer: read-only; finds files, dependencies, risks, and minimal context.
- Reviewer: read-only; reviews diff and checklist compliance.
- QA: read-only or test-only; runs or designs targeted validation.
- Implementation: one writer at a time in a worktree. Use separate worktrees for parallel write scopes.
