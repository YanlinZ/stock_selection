# Codex Context Map

This file routes agents to the smallest useful context for each task. Read this file after root `AGENTS.md` and before opening large PRD, phase, QA, bug, or process documents.

## Active State

- Active state: Phase 5B Plan Status Tracking is complete, merged through PR #42 and PR #43, deployed, local 390px-smoked, and production desktop-smoked as of 2026-05-16; 390px production mobile smoke remains pending because the available browser wrapper did not expose viewport resizing. Phase 5B adds factual plan status tracking for Dashboard and history judgments: approaching, triggered, invalidated, still valid, or insufficient data. It uses normalized market data plus safe key-level snapshot context and does not output automatic review conclusions, self-iteration, or rule changes. Phase 5A History Judgment and Performance Tracking is complete, merged, deployed, and production-QA smoked as of 2026-05-16. Phase 4 Watchlist Opportunity Scan is complete, merged, deployed, and production-QA smoked on 2026-05-15. Phase 3 Dashboard Trust is merged, migrated, and production-smoked; Phase 2 Dashboard v1 and Phase 2.1 local hardening are complete and merged. Production closure QA passed on 2026-05-15; QA-001 through QA-007 are closed.
- Latest phase plan: `docs/tech/TECH-PLAN-v2026.05.16-phase-5b-plan-status-tracking.md`
- Latest completed phase plan: `docs/tech/TECH-PLAN-v2026.05.15-phase-4-watchlist-opportunity-scan.md`
- Latest hardening plan: `docs/tech/TECH-PLAN-v2026.05.14-phase-2.1-hardening.md`
- Latest completed technical status: `docs/tech/TECH-PLAN-v2026.05.15-phase-4-watchlist-opportunity-scan.md`
- Phase 2 completed technical status: `docs/tech/TECH-PLAN-v2026.05.14.md`
- Phase 1 status: complete; configuration page, provider contracts, ingestion, normalized data, and production smoke are done.
- Phase 2 result: Dashboard v1 reads normalized data and outputs rule-based, explainable daily guidance with reasons, risks, data dates, macro scoring, technical indicators, and key price level proximity.
- Phase 3 result: Dashboard Trust for Holdings Decisions strengthens holding action trust with source/update metadata, support/opposition/risk/missing evidence groups, confidence/data-quality tags, and lightweight daily decision snapshots.
- Phase 4 result: Watchlist Opportunity Scan surfaces at most one rules-only high-quality holding/watchlist opportunity, or explicitly stays quiet when no opportunity clears the bar.
- Phase 5A result: History Judgment and Performance Tracking reads persisted Dashboard decision snapshots, includes available Phase 4 opportunities in history, calculates basic 1/5/20 trading-day outcomes from normalized daily prices, and shows pending/insufficient states when data is not available.
- Phase 5B result: Plan Status Tracking shows factual approaching/triggered/invalidated/still-valid/insufficient states for current Dashboard targets and historical judgment entries; local 390px smoke and production desktop smoke passed, and 390px production mobile smoke remains pending.
- Current boundary: do not add AI summaries, news/earnings deep understanding, automatic scheduled jobs, broker sync, real trading, push notifications, high-frequency market data, full-market recommendations, automatic self-iteration, rule-change proposals, or automatic review conclusions unless explicitly requested.

## Canonical Entrypoints

- Product overview: `docs/prd/PRD-v2026.05.10.md`
- Product delta and future replay/self-improvement notes: `docs/prd/PRD-v2026.05.11.md`
- Latest phase plan and acceptance criteria: `docs/tech/TECH-PLAN-v2026.05.16-phase-5b-plan-status-tracking.md`
- Latest completed phase plan and completion status: `docs/tech/TECH-PLAN-v2026.05.15-phase-4-watchlist-opportunity-scan.md`
- Phase 3 completion plan and acceptance criteria: `docs/tech/TECH-PLAN-v2026.05.14-phase-3-dashboard-trust.md`
- Phase 2.1 hardening plan and acceptance criteria: `docs/tech/TECH-PLAN-v2026.05.14-phase-2.1-hardening.md`
- Phase 2 completed technical status: `docs/tech/TECH-PLAN-v2026.05.14.md`
- Phase 2 implementation plan/history: `docs/tech/TECH-PLAN-v2026.05.12.md`
- Harness Engineering definition: `docs/engineering/HARNESS-ENGINEERING.md`
- Harness feedback loop for agent workflows: `docs/harness-engineering.md`
- QA protocol: `docs/process/QA-AGENT.md`
- Planner protocol: `docs/process/PLANNER-AGENT.md`
- Local smoke matrix: `docs/qa/LOCAL-SMOKE.md`
- Current QA regression cases: `docs/qa/ONLINE-QA-REGRESSION-v2026.05.12.md`
- Current open QA issues: `docs/qa/ONLINE-QA-ISSUES-v2026.05.12.md`
- Latest production QA run: `docs/qa/runs/QA-RUN-v2026.05.15-production-closure.md`
- Latest Phase 5A production QA run: `docs/qa/runs/QA-RUN-v2026.05.16-phase-5a-production.md`
- Latest Phase 4 local QA run: `docs/qa/runs/QA-RUN-v2026.05.15-phase-4-local.md`
- Review protocol: `docs/process/CODE-REVIEW-AGENT.md`
- Review checklist: `docs/review/code_review.md`
- Autonomous ship gate: `docs/process/SHIP-GATE.md`
- Recommended development workflow: `docs/workflows/codex-development-flow.md`

## Acceptance Criteria

For Phase 5A History Judgment and Performance Tracking implementation or follow-up, use `docs/tech/TECH-PLAN-v2026.05.16-phase-5a-history-performance-tracking.md` first:

- Planner gate: section 0
- Technical discovery: section 1
- In scope / out of scope: sections 3 and 4
- Recommended implementation order: section 5
- Acceptance criteria: section 6
- Validation plan: section 7
- Done criteria: section 9
- Current next step: section 10

For Phase 4 Watchlist Opportunity Scan maintenance or follow-up, use `docs/tech/TECH-PLAN-v2026.05.15-phase-4-watchlist-opportunity-scan.md` first:

- Planner gate: section 0
- Technical discovery: section 1
- In scope / out of scope: sections 3 and 4
- Recommended implementation order: section 5
- Acceptance criteria: section 6
- Validation plan: section 7
- Done criteria: section 9

For Phase 3 Dashboard Trust maintenance, use `docs/tech/TECH-PLAN-v2026.05.14-phase-3-dashboard-trust.md` first:

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
| Phase 5B Plan Status Tracking implementation/follow-up | Phase 5B plan, directly relevant Dashboard target/history source/tests, `src/server/dashboard/types.ts`, `src/server/dashboard/target-decisions.ts`, `src/server/dashboard/history.ts` | PRD v2026.05.11 replay/self-improvement sections only when phase boundary is unclear; Phase 5A plan only when history behavior is unclear |
| Phase 5A History Judgment and Performance Tracking implementation/follow-up | Phase 5A plan, directly relevant Dashboard snapshot/history source/tests, `src/db/schema.ts` and `src/server/dashboard/repository.ts` when history reads are touched | PRD v2026.05.11 review/self-improvement sections only when phase boundary is unclear; Phase 4 plan only when opportunity history behavior is unclear |
| Phase 4 Watchlist Opportunity Scan maintenance/follow-up | Phase 4 plan, latest production QA closure run, directly relevant Dashboard source/tests | PRD v2026.05.10 opportunity model sections only when rule scope is unclear |
| Phase 2.1 hardening / QA issue reconciliation | Phase 2.1 hardening plan, current QA open issues, local smoke matrix, directly relevant auth/settings/Dashboard source/tests | Older phase plans only when a fix depends on their implementation details |
| Phase 3 Dashboard Trust implementation | Phase 3 plan, latest tech status, directly relevant Dashboard source/tests, schema/migration files if snapshots are touched | PRD v2026.05.11 decision snapshot notes only when scope questions arise |
| Phase 2 Dashboard maintenance/follow-up | Latest tech status, directly relevant Dashboard source/tests, relevant PRD sections for Dashboard/product rules | Original Phase 2 implementation plan, older tech plans, QA issue history |
| Product/scope decision | PRD v2026.05.10 plus PRD v2026.05.11 delta | Old tech plans |
| Next development planning | Planner protocol, latest phase plan, latest completed tech status, directly relevant PRD/QA/review inputs | Old phase plans only when the plan depends on their implementation details |
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
