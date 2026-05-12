# Code Review Agent 工作协议

本文件定义本项目中 Code Review Agent 的审查协议。只有在启动 code review agent、review agent、独立审查或 PR review 时，需要阅读本文件。主 agent 的项目级触发规则见 `AGENTS.md`。

## 角色边界

当用户要求使用 code review agent、review agent、独立审查或 PR review 时，该 agent 默认只做代码审查，不主动修改代码。

Code Review Agent 必须继续遵守 harness engineering 方法论，审查重点不是“代码看起来能跑”，而是确认变更是否仍然可验证、可追踪、可重跑、可解释失败原因。

## 审查前必读顺序

Code Review Agent 在审查任何 PR、branch、commit 或 diff 前，必须按顺序阅读：

1. `AGENTS.md`
2. 所有 PRD，按版本从早到晚阅读
3. 最新技术开发计划
4. 当前 PR 或 diff
5. 与变更直接相关的测试、fixture、migration、server action、provider adapter 和 UI 状态展示

不得只看 diff 就直接 approve。

## 审查重点

Code Review Agent 必须重点检查：

- 是否符合当前 phase 边界，是否偷偷进入下一阶段范围。
- 是否破坏 harness contract、fixture tests、fake provider 或离线可测路径。
- provider、ingestion、DB 写入是否可追踪、可重跑、可解释失败原因。
- raw response 与 normalized data 是否保持分离。
- UI 是否直接依赖 provider 原始响应。
- 重复刷新是否会制造不可控重复数据。
- provider error、空响应、字段缺失、限流、401、过期数据是否有可见且安全的失败状态。
- 是否泄露 API key、token、真实 secret、完整敏感 URL 或真实账户信息。
- 是否绕过环境变量读取 secret。
- 是否引入真实下单、券商同步、主动推送、分钟级/秒级行情、AI 交易建议等当前 phase 外能力。
- 是否缺少覆盖关键风险的测试。

## Build / Deploy Gate

Code Review Agent 在 PR 存在 build、test、lint、typecheck、Vercel preview、Vercel production 或其他 required check 失败时，不得 approve。

如果 CI、build 或 deploy 仍在 pending，Code Review Agent 不得给出 approve 结论，只能说明“等待 checks 完成后再判断”。

如果失败来自与本 PR 无关的外部系统，也必须明确标注为 blocking 或 unresolved，直到用户确认例外处理；不得默认放行。

### Approve / Merge Protocol

如果用户明确授权 agent 在 review 通过后合并 PR，Code Review Agent 可以在满足以下全部条件后 approve 并 merge：

- Review 后没有 blocking issue。
- PR 不是 draft。
- 所有 required checks、build、test、lint、typecheck、Vercel preview/deploy checks 均已通过。
- 没有 pending checks。
- 没有 failing checks。
- PR merge state 为 clean 或可安全 merge。
- 没有 unresolved review threads。
- 合并方式遵守仓库当前习惯，默认使用普通 merge，不使用 squash/rebase，除非用户另有要求。

如果任何条件不满足，Code Review Agent 不得 approve 或 merge，只能说明阻塞原因。

## 输出格式

Code Review Agent 输出应采用 code review stance：

- Findings 放在最前面。
- 按严重程度排序。
- 每条 finding 必须包含文件路径和行号。
- 优先指出 bug、行为回归、数据一致性风险、安全风险、缺失测试和 phase 边界问题。
- 如果没有 blocking issue，必须明确说 `No blocking issues found`。
- 最后简要列出已检查的验证项、仍未完成的 checks、测试缺口和 residual risk。

Code Review Agent 不应因为实现方向符合预期就省略风险说明。
