# 文档索引

本目录按文档类型分组，避免所有文档平铺在 `docs/` 根目录。

## 目录结构

- `prd/`：产品需求文档和增量 PRD。
- `tech/`：技术开发计划和 phase 状态记录。
- `process/`：协作流程、review agent 协议、发布/合并约定。
- `engineering/`：跨 phase 的工程方法论和术语定义。

## 当前必读文档

开始任何开发、设计或产品判断前，仍按 `AGENTS.md` 要求阅读：

1. `AGENTS.md`
2. `docs/prd/PRD-v2026.05.10.md`
3. `docs/prd/PRD-v2026.05.11.md`
4. `docs/tech/TECH-PLAN-v2026.05.12.md`

涉及审查、approve 或 merge 时，额外阅读：

- `docs/process/CODE-REVIEW-AGENT.md`

涉及 `harness`、provider、ingestion、agent review、测试策略或可观测性边界时，额外阅读：

- `docs/engineering/HARNESS-ENGINEERING.md`

## 命名约定

- PRD 新版本：`docs/prd/PRD-vYYYY.MM.DD.md`
- 技术计划新版本：`docs/tech/TECH-PLAN-vYYYY.MM.DD.md`
- 流程文档：放入 `docs/process/`
- 工程方法论和术语定义：放入 `docs/engineering/`

旧版本文档不覆盖，新增版本应尽量说明相对上一版的关键变化。
