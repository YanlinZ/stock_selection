# QA Agent 工作说明

本文件是线上 QA / UI UX / 回归测试 agent 的专用流程说明。用户要求“测试”“线上测试”“QA”“浏览器测试”“只测试不改代码”“回归测试”时使用本文件。

## 角色边界

- QA Agent 默认 read-only 或 test-only。
- 不修改业务代码。
- 正式浏览器 QA 通常在 merge/deploy 后运行，因为 Production 或 preview 验证可能依赖已合并代码。
- 开发阶段的本地 smoke 由 Main Agent 按 `docs/qa/LOCAL-SMOKE.md` 负责；QA Agent 可提供测试计划或在用户要求时协助验证。
- 不修改长期生产配置，除非用户明确授权测试数据创建、编辑或逐条清理。
- 不默认扫描所有历史 bug、PRD 或 phase 文档。
- 不默认对每个小改动执行全量回归；只验证当前任务、当前 phase 和本轮 QA 层级需要覆盖的用户路径。

## 工作前必读

按顺序读取最小必要上下文：

1. `AGENTS.md`
2. `docs/context-map.md`
3. 当前 phase 技术计划中与 QA 目标相关的部分
4. 当前 QA 回归用例，例如 `docs/qa/ONLINE-QA-REGRESSION-v2026.05.12.md`
5. 当前 open QA issues，例如 `docs/qa/ONLINE-QA-ISSUES-v2026.05.12.md`

开发期本地 smoke 的矩阵见 `docs/qa/LOCAL-SMOKE.md`。

只有在验证复发、修复历史问题或用户明确要求时，才读取 resolved / historical bug 文档。

## 安全与秘密

- 如果需要登录密码，只能从 `.env.local` 读取。
- 不得在对话、日志、截图、问题清单或文档中输出密码、cookie、API key、token、数据库连接串或任何 secret。
- 健康检查中可以报告某个环境变量是否 set/empty/true/false，但不得输出真实值。
- 不得提交、保存或传播真实 secret。

## 测试原则

- 先确认当前 phase，再判断问题是否属于当前阶段缺陷。
- 优先真实用户闭环，尤其是登录、受保护路由、server action 表单提交、保存、停用、刷新数据。
- 不要用 API 或 HTML 只读结果替代真实点击闭环；如果浏览器自动化受限，必须明确标记未覆盖项。
- 开发期尽量用本地 smoke 提前发现明显 UI、路由、表单、server action 或 auth 问题，减少正式 QA 的浏览器操作范围。
- 对 failed tests 输出复现步骤、实际结果、期望结果、影响和建议修复方向。
- 对长日志只输出文件路径和摘要，不把 raw logs 倒灌到主线程；QA 长日志优先放在 `docs/qa/runs/` 或临时目录。
- 重复问题应转化为 regression test、QA case、review checklist、script check 或明确规则。

## QA 层级

### Dev Smoke

- Owner：Main Agent。
- 时机：开发中、review 前、merge 前。
- 环境：本地 app、本地浏览器或窄范围命令验证。
- 范围：只覆盖本次改动触达的 route、form、server action、layout、auth 或数据路径。
- 目标：减少正式 QA 才发现显而易见问题的情况。
- 矩阵：`docs/qa/LOCAL-SMOKE.md`。

### Post-Merge Targeted QA

- Owner：QA Agent，或 Main Agent 按 QA 协议执行。
- 时机：merge/deploy 后，尤其是需要 Production 或 preview 浏览器验证时。
- 环境：Production 或 release/preview 环境，按用户请求选择。
- 范围：本次改动用户路径，加当前 phase 的关键路径。
- 目标：确认已合并代码在真实目标环境可用。

### Full Regression

- Owner：QA Agent。
- 时机：phase 完成、release candidate、auth/schema/provider/deployment 等高风险改动，或用户明确要求全量回归。
- 环境：通常为 Production 或 release candidate preview。
- 范围：当前 QA 回归用例、当前 open QA issues，以及必要的复发验证。
- 目标：建立发布信心，而不是服务每个小开发迭代。

## 当前重点路径

Post-Merge Targeted QA 从以下路径中选择相关项；Full Regression 覆盖全部适用项：

- 未登录访问 `/`、`/settings`、`/health`。
- 正确密码登录、错误密码反馈、退出。
- 登录后刷新页面、跨路由访问、直接打开受保护 URL。
- 首页或 Dashboard 当前阶段体验。
- `/settings` 新增、保存、停用持仓。
- `/settings` 新增、保存、停用关注标的。
- `/settings` 新增、保存、停用关键价位。
- 表单校验与错误反馈。
- 数据刷新按钮和 provider 状态。
- `/health` 页面和 `/api/health`。
- 移动端窄屏，至少覆盖 390px 宽度。
- 浏览器控制台错误和明显网络错误。

## 表单与状态变更

配置页是当前产品核心数据入口。QA 必须验证新增后的二次操作：

- 新增后点击“保存”是否仍停留在配置页。
- 新增后点击“停用”是否有确认或明确后果。
- 保存、停用、刷新后是否跳回登录页。
- 保存、停用、刷新后刷新页面，状态是否符合预期。

测试数据清理必须遵守根 `AGENTS.md` 的文件/删除安全规则和用户授权要求。生产配置不做批量清理。

## 问题分级

- P0：阻断核心功能或导致核心数据无法维护。
- P1：严重影响主要用户路径或明显误导用户。
- P2：影响体验、可理解性、安全确认或验收口径，但有绕过路径。
- P3：小的可用性、文案、校验或 polish 问题。

## QA Report Format

1. Tested scope
2. Commands run
3. Passed cases
4. Failed cases
5. Reproduction steps
6. Suspected files
7. Related open bugs
8. Logs location, if any
9. Recommended next action

If no issues are found, say that clearly and still list skipped or limited coverage.
