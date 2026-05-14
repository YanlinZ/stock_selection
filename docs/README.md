# 文档索引

本目录按文档类型分组。AI agents 不应默认扫描所有文档；请先使用 `docs/context-map.md` 选择最小必要上下文。

## 目录结构

- `context-map.md`：Codex 文档路由器，说明不同任务应该读取哪些文档。
- `prd/`：产品需求文档和增量 PRD。
- `tech/`：技术开发计划和 phase 状态记录。
- `process/`：planner / QA / review agent 协议和协作流程。
- `review/`：稳定 code review checklist。
- `engineering/`：跨 phase 的工程方法论和术语定义。
- `qa/`：线上 QA 问题清单、回归测试用例和测试复盘。
- `workflows/`：Codex、多 agent、worktree 和卡死排障流程。

## 当前入口

开始任何开发、设计、QA 或 review 前：

1. 阅读根 `AGENTS.md`。
2. 阅读 `docs/context-map.md`。
3. 按 task type 打开最小必要文档。

涉及审查、approve 或 merge 时，额外阅读：

- `docs/process/CODE-REVIEW-AGENT.md`
- `docs/review/code_review.md`
- `docs/process/SHIP-GATE.md`

涉及下一步开发计划、phase 拆分、修复排序或 ambiguous follow-up 时，额外阅读：

- `docs/process/PLANNER-AGENT.md`

涉及线上测试、浏览器测试、QA、UI/UX 测试或回归测试时，额外阅读：

- `docs/process/QA-AGENT.md`
- `docs/qa/LOCAL-SMOKE.md`，仅当涉及开发期本地 smoke。
- 当前 phase 的 `docs/qa/` 回归用例。

涉及 Harness Engineering 定义时阅读：

- `docs/engineering/HARNESS-ENGINEERING.md`

涉及 AI workflow 反馈闭环时阅读：

- `docs/harness-engineering.md`
- `docs/workflows/codex-development-flow.md`

## 命名约定

- PRD 新版本：`docs/prd/PRD-vYYYY.MM.DD.md`
- 技术计划新版本：`docs/tech/TECH-PLAN-vYYYY.MM.DD.md`
- 流程文档：放入 `docs/process/`
- 工程方法论和术语定义：放入 `docs/engineering/`
- QA 问题清单和回归用例：放入 `docs/qa/`

旧版本文档不覆盖。新增版本应尽量说明相对上一版的关键变化。
