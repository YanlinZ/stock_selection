# Code Review Agent 工作协议

本文件定义 Code Review Agent 的审查协议。用户要求 code review agent、review agent、独立审查、PR review、approve 或 merge 时使用本文件。进入 approve、merge、deploy 或 post-merge QA 时，Main Agent 还必须使用 `docs/process/SHIP-GATE.md`。

核心模式：

- Reviewer Agent = 独立审查 gate，只给出审查结论和阻塞项。
- Main Agent = ship executor，在 reviewer gate 通过且 PR checks 全部通过时，自主执行 approve/merge/deploy 下一步，并触发 post-merge QA。

## 角色边界

- Code Review Agent 默认 read-only。
- 不主动修改代码。
- 不执行 approve、merge、deploy 或 QA 触发；这些由 Main Agent 按 ship gate 执行。
- 不默认扫描所有 PRD、phase、QA、bug 历史文档。
- 不把 raw logs、完整 CI 输出或长测试输出倒灌到主线程。
- 重点审查 blocking bugs、行为回归、数据一致性、安全、phase 边界、缺失测试和可维护性风险。

## 审查前必读

按顺序读取最小必要上下文：

1. `AGENTS.md`
2. `docs/context-map.md`
3. `docs/review/code_review.md`
4. 当前 PR、branch、commit 或 working-tree diff
5. 与变更直接相关的 phase acceptance criteria、测试、fixture、migration、server action、provider adapter 或 UI 状态展示

只有当审查结论依赖产品边界时，才按 `docs/context-map.md` 打开相关 PRD sections。不要默认通读全部历史文档。

## 审查重点

- 是否符合当前 phase 边界。
- 是否破坏 harness contract、fixture tests、fake provider 或离线可测路径。
- provider、ingestion、DB 写入是否可追踪、可重跑、可解释失败原因。
- raw response 与 normalized data 是否保持分离。
- UI 是否直接依赖 provider 原始响应。
- 重复刷新是否会制造不可控重复数据。
- provider error、空响应、字段缺失、限流、401、过期数据是否有可见且安全的失败状态。
- 是否泄露 API key、token、真实 secret、完整敏感 URL 或真实账户信息。
- 是否绕过环境变量读取 secret。
- 是否缺少覆盖关键风险的测试。
- 是否有重复问题应该进入 `docs/harness-engineering.md` 描述的反馈闭环。

## Build / Deploy Gate

Code Review Agent 在 PR 存在 build、test、lint、typecheck、Vercel preview、Vercel production 或其他 required check 失败时，不得给出 ship-ready 结论。

如果 CI、build 或 deploy 仍在 pending，Code Review Agent 不得给出 ship-ready 结论。Pending 可等待最多 8 分钟；超过 8 分钟仍 pending 时，必须标为 blocking/unresolved，并说明下一步。

Vercel 状态可以来自 GitHub PR checks、status rollup 或 Vercel bot comment。只要 GitHub 中可见的 Vercel 状态不是 Ready/passing，就不得 ship-ready。

如果失败来自与本 PR 无关的外部系统，也必须明确标注为 blocking 或 unresolved，直到用户确认例外处理；不得默认放行。

## Main Agent Ship Protocol

本仓库默认授权 Main Agent 在 review 通过后按 `docs/process/SHIP-GATE.md` 执行 ship flow。Main Agent 可以在满足以下全部条件后自主 approve/merge，并让 Vercel 自动触发 deploy：

- Reviewer Agent 没有发现 blocking issue，或 blocking issue 已修复并复审通过。
- PR 不是 draft。
- 所有 required checks、build、test、lint、typecheck、Vercel preview/deploy checks 均已通过。
- 没有 pending checks。
- 没有 failing checks。
- PR merge state 为 clean 或可安全 merge。
- 没有 unresolved review threads。
- Main Agent 已知本轮 targeted validation/local smoke 结果，或明确记录跳过原因。
- 没有 check 或 deploy pending 超过 8 分钟。
- 合并方式遵守仓库当前习惯，默认使用普通 merge，不使用 squash/rebase，除非用户另有要求。

任何条件不满足时，Main Agent 不得 merge，只能说明阻塞原因和下一步。若 `gh` token 失效或不可用，Main Agent 应 fallback 到 GitHub connector，再 fallback 到浏览器或 Chrome 查看 PR，并在 ship summary 记录使用了哪个路径。

如果 GitHub 不允许当前身份对自己创建的 PR 提交 formal approval，Main Agent 应记录 ship gate 已通过，并在 branch protection 允许时继续 merge；如果 branch protection 要求无法满足的 approval，停止并报告阻塞。

Merge 后：

- Vercel production deploy 由 merge 自动触发。
- Main Agent 应尽量等待或检查 deploy 结果。
- Deploy 成功后，Main Agent 触发 post-merge targeted QA。
- Deploy pending 或失败时，不触发正式 QA，先报告阻塞或修复 deploy 问题。

## Review Output Format

Findings first, ordered by severity:

1. Blockers
2. Non-blocking issues
3. Missing tests
4. Risk areas
5. Checks reviewed / still pending
6. Recommended fixes

每条 finding 必须包含文件路径和行号。若没有 blocking issue，必须明确写 `No blocking issues found`，并说明残余风险或未覆盖验证。
