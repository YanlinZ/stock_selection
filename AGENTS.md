# AGENTS.md

This is the root instruction file for AI coding/product agents working in this repo. Keep it short. Detailed product, phase, QA, bug, and review context lives behind the context router.

## Project Map

- Context router: `docs/context-map.md`
- Product overview: `docs/prd/PRD-v2026.05.10.md`
- Current PRD delta: `docs/prd/PRD-v2026.05.11.md`
- Current phase plan: `docs/tech/TECH-PLAN-v2026.05.16-phase-5a-history-performance-tracking.md`
- QA entrypoint: `docs/process/QA-AGENT.md`
- QA cases and open issues: `docs/qa/`
- Planner protocol: `docs/process/PLANNER-AGENT.md`
- Review protocol: `docs/process/CODE-REVIEW-AGENT.md`
- Review checklist: `docs/review/code_review.md`
- Harness feedback loop: `docs/harness-engineering.md`
- Recommended Codex workflow: `docs/workflows/codex-development-flow.md`

Current active state: Phase 5A History Judgment and Performance Tracking is selected and development-prep is complete as of 2026-05-16; implementation has not started yet. Phase 5A should let users review historical Dashboard judgments and basic 1/5/20 trading-day performance using normalized snapshots and market data, without automatic review conclusions or rule changes. Phase 4 Watchlist Opportunity Scan is complete, merged, deployed, and production-QA smoked on 2026-05-15. Phase 3 Dashboard Trust is merged, migrated, and production-smoked; Phase 2 Dashboard v1 and Phase 2.1 local hardening are complete and merged. Production closure QA passed on 2026-05-15; QA-001 through QA-007 are closed. Scope must stay inside Dashboard plus simple settings; do not start broker sync, real trading, push notifications, high-frequency data, full-market recommendations, automatic self-iteration, rule-change proposals, or AI summaries unless explicitly requested.

## Working Rules

- Start by reading `docs/context-map.md`, then open only the minimum documents needed for the task type.
- Do not default-scan every PRD, old phase plan, QA issue file, resolved bug, or historical document.
- Keep MVP scope tight: Dashboard plus simple settings. Do not add broker sync, real trading, push notifications, high-frequency data, full-market recommendations, or AI summaries unless explicitly requested.
- Trading recommendations must be explainable and include reasons, risks, and data date.
- Use normalized internal data for Dashboard work. Do not make UI depend on provider raw payloads.
- Do not commit API keys, tokens, passwords, database URLs, cookies, or real account information.
- Do not paste raw logs into the main thread. Save long logs to a file and report the file path plus a short summary.
- Prefer targeted tests while iterating; use full `pnpm check` for larger or risky changes.
- For browser-visible changes, run local dev smoke when practical; formal browser QA is post-merge/deploy and targeted by default.
- Use the Planner Agent protocol before planning next development work for medium, large, phase, cross-module, or ambiguous follow-up tasks.
- After reviewer gate passes and all PR checks are green, Main Agent may approve/merge, rely on Vercel auto-deploy, and trigger post-merge QA.
- Only one writing agent should modify code in a worktree at a time. Explorer, reviewer, and QA agents are read-only or test-only by default.
- If parallel implementation is needed, use separate git worktrees or independent branches and merge serially.
- After implementation, re-check this file and `docs/context-map.md`. If project rules need to change, ask the user before updating them.

## File Safety

- Do not batch-delete files or directories.
- Do not use `del /s`, `rd /s`, `rmdir /s`, `Remove-Item -Recurse`, or `rm -rf`.
- If a file must be deleted, delete only one explicit path at a time.
- If many files need deletion, stop and ask the user to handle or explicitly approve the cleanup plan.

## Validation

Commands are defined in `package.json`:

- Development server: `pnpm dev`
- Build: `pnpm build`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Unit tests: `pnpm test`
- Full local check: `pnpm check`
- Database migration: `pnpm db:migrate`

No e2e command is currently configured. Browser/QA coverage is documented in `docs/qa/` and should be run manually or through the selected browser tool when requested.

## Agent Boundaries

- Main agent: owns task framing, implementation, integration, and final summary.
- Planner agent: read-only planning gate for next development work; returns scope, ordered steps, validation, risks, and recommended handoff.
- Explorer agent: read-only context search; returns relevant files, dependencies, risks, and next action.
- Reviewer agent: read-only diff review gate; focuses on blockers, regressions, missing tests, security, data consistency, and phase boundary drift. It does not merge or deploy.
- QA agent: read-only or test-only; verifies current phase user flows, summarizes failures, and stores long logs as files.
- Implementation agent, if used: the only writer for its assigned scope. Do not run multiple writing agents against the same files.

## Done When

- The requested implementation or workflow change is complete.
- Relevant tests, lint, typecheck, or checks were run, or skipped with a clear reason.
- The diff was reviewed for scope, secrets, phase boundaries, and docs impact.
- QA impact is noted for user-facing or workflow changes.
- Any repeated failure pattern is converted into a test, checklist item, script check, QA case, or documented rule instead of a longer prompt.
