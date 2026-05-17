# stock_selection 技术开发计划

版本：v2026.05.16-phase-5b-plan-status-tracking

本文件基于 Phase 5A History Judgment and Performance Tracking 完成态，定义并记录 Phase 5B：Plan Status Tracking / 计划状态追踪。

## 当前准备状态

- Phase 5A 已完成、合入、部署并通过 production smoke。
- 当前 Dashboard 已能生成规则化判断、可信证据、Phase 4 opportunity，并将 summary、holding、opportunity 快照写入 `dashboard_decision_snapshots`。
- `/dashboard/history` 已能读取历史判断并基于 normalized daily prices 计算 1 / 5 / 20 个交易日基础表现。
- Phase 5B 已完成本地实现、targeted tests、`pnpm check` 和 `pnpm build`。
- 本地 browser smoke 已尝试，但受 browser tooling / escalation safety 限制未完成；merge/deploy 后仍需要 browser 或 production QA。
- Phase 5B 补齐 PRD 中进入复盘机制前需要的基本计划状态追踪：接近、触发、失效、仍有效。

## 0. Planner Gate

Goal：

- 让用户在 Dashboard 和历史判断页看到重要判断的当前计划状态：接近、触发、失效、仍有效，或数据不足。
- 为未来复盘任务打基础，但不输出自动复盘结论、判断质量评价或规则修改建议。

Scope：

- 包含基于 normalized market data、Dashboard target key levels 和 persisted decision snapshot key levels 的计划状态计算。
- 包含 Dashboard target row、Phase 4 opportunity、历史判断页的轻量状态展示。
- 状态只表达事实：最新价格、依据日期、关联关键价位、距离和状态原因。
- 明确不包含 AI summaries、自动复盘结论、自动规则修改、用户确认式规则更新、broker sync、真实交易、主动推送、分钟级/秒级行情、全市场推荐或完整回测系统。

Plan：

1. 新增 plan status 纯函数和类型，覆盖 `approaching`、`triggered`、`invalidated`、`still_valid`、`insufficient_data`。
2. 将当前 Dashboard target 的 `latestPrice`、`latestPriceDate` 和 key level proximity 转为 `planStatus`。
3. 将 history assembler 用 persisted snapshot key levels 加 normalized market data 计算每条历史判断的当前 `planStatus`。
4. 在 `/dashboard` target rows 和 `/dashboard/history` history cards 展示状态 badge 与简短说明。
5. 补齐 targeted tests，先写 failing tests，再实现。
6. 跑 targeted tests、`pnpm check`、本地 browser smoke，再走 Reviewer gate。

Validation：

- 定向测试：

```bash
pnpm test src/server/dashboard/plan-status.test.ts src/server/dashboard/service.test.ts src/server/dashboard/history.test.ts src/components/dashboard/dashboard-view.test.ts src/components/dashboard/dashboard-history-view.test.ts
```

- 合并前检查：

```bash
pnpm check
```

- 本地 smoke：

```bash
pnpm dev
```

浏览器检查：

- `/dashboard`：target row 显示计划状态，不影响 Phase 4 今日机会、trust evidence 和 settings/history 链接。
- `/dashboard/history`：history entry 显示计划状态和状态说明，仍不出现成功/失败、规则有效/无效、自动复盘结论。
- 390px mobile：状态 badge、说明、长 symbol 和 long rule version 不横向溢出。

Risks：

- Phase 边界：Phase 5B 是状态追踪，不是复盘；不能把状态包装成判断质量或规则建议。
- 数据一致性：当前 Dashboard 用实时 target key levels，历史页用 persisted snapshot key levels；两者来源不同，UI 文案必须表达为“计划状态”而不是“复盘结论”。
- 数据不足：缺少 instrument、basis date、key level 或 normalized price 时必须显示 `insufficient_data`，不能硬算。
- Schema 风险：本阶段默认不新增 schema；如果实现中发现必须新增 review task 或 outcome table，应停止并重新过 Planner gate。

## 1. 技术摸底结果

- `src/server/dashboard/types.ts` 已有 `DashboardTargetSnapshot`、`DashboardHistoryEntry`、`DashboardDecisionSnapshotRecord`。
- `src/server/dashboard/target-decisions.ts` 已为当前 target 生成 `keyLevels` proximity、`latestPrice`、`latestPriceDate` 和 trust action。
- `src/server/dashboard/history.ts` 已组装 history entries，并能按 instrument id 关联 normalized market data。
- `src/server/dashboard/decision-snapshots.ts` 已持久化 safe key level snapshot，包含 price、levelType、state、thresholdPercent、distancePercent。
- `src/components/dashboard/dashboard-view.tsx` 和 `src/components/dashboard/dashboard-history-view.tsx` 已有 badge/card 样式，适合直接追加克制状态展示。

## 2. 完成定义

当前状态：已完成本地实现、targeted tests、`pnpm check` 和 `pnpm build`，等待 reviewer/PR/merge/deploy。浏览器 smoke 未完成，需在 merge/deploy 后补 production/browser QA。

- 当前 Dashboard target snapshot 包含 `planStatus`。
- 历史判断 entry 包含 `planStatus`。
- UI 展示计划状态，但不输出自动复盘结论或规则建议。
- 所有状态计算只依赖 normalized internal data 和 safe snapshot context。
- 定向 tests 和 `pnpm check` 通过。
- 本地 browser smoke 已尝试但未完成；原因记录在 `docs/qa/runs/QA-RUN-v2026.05.16-phase-5b-local.md`。
- 本地 QA/validation 记录在 `docs/qa/runs/QA-RUN-v2026.05.16-phase-5b-local.md`。
- Diff 经 reviewer gate 通过或无 blocking issue。
