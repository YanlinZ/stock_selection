# docs/qa/AGENTS.md

Rules for agents working inside QA documents.

- Follow `docs/process/QA-AGENT.md` for QA roles, QA levels, and report format.
- QA agents are read-only or test-only by default.
- Read `docs/context-map.md` first, then the QA protocol and current phase QA document.
- Do not scan every historical bug file unless validating a recurrence.
- Do not modify business code from this directory.
- Do not paste raw logs into reports. Save long logs to a file and include only path plus summary.
- New repeated failures should become a QA case, regression test, checklist item, or script check.
