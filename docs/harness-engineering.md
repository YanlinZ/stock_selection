# Harness Engineering Feedback Loop

This document describes how this repo turns repeated AI development failures into durable controls. The canonical definition of Harness Engineering remains `docs/engineering/HARNESS-ENGINEERING.md`.

## Principle

Do not solve repeated mistakes by making prompts longer. Convert repeated mistakes into controls that run, route, or constrain the work.

## Feedback Loop

When Codex, a subagent, QA, review, CI, or a human finds a repeated failure, choose one durable home for the lesson:

- Test: behavior can be executed and asserted.
- Lint rule: pattern can be detected statically.
- Script check: repository invariant can be checked cheaply.
- Review checklist item: needs judgment but should never be forgotten.
- Root `AGENTS.md` rule: short, global, and repeatedly relevant.
- Context map route: prevents agents from reading too much or too little.
- QA test case: user flow or regression must be exercised.
- Phase acceptance criterion: required for completing the current phase.

## What Goes Where

- Put global, stable rules in `AGENTS.md`.
- Put routing and "what to read" decisions in `docs/context-map.md`.
- Put reviewer judgment criteria in `docs/review/code_review.md`.
- Put QA user-flow checks in `docs/qa/`.
- Put phase-specific acceptance criteria in the latest `docs/tech/TECH-PLAN-vYYYY.MM.DD.md`.
- Put implementation behavior in tests or scripts, not prose, when it can be checked automatically.

## Logs And Evidence

- Do not paste raw logs into the main thread or review/QA reports.
- Save long logs to a file and summarize the important failure lines.
- Reports should include command, scope, result, log location, and next action.
- Secrets must never appear in logs, screenshots, fixtures, or reports.

## After A Bug Fix

- Add or update a regression test when practical.
- Update the QA case when the bug was user-facing.
- Update the review checklist when the bug reflects a recurring review blind spot.
- Update `docs/context-map.md` only when agents repeatedly read the wrong context.
- Update `AGENTS.md` only for short global rules that should apply to nearly every task.

## Judgment Boundary

Computational controls should catch repeatable mistakes. AI reviewer and human reviewer attention should be reserved for architecture, product scope, data trust, security judgment, and tradeoffs that cannot be reduced to a cheap check.
