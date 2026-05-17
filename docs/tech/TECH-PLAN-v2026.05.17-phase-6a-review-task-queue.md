# stock_selection 技术开发计划

版本：v2026.05.17-phase-6a-review-task-queue

本文件基于 Phase 5B Plan Status Tracking 完成态，定义并记录 Phase 6A：Review Task Queue / 待人工复盘队列。Phase 6A 是进入复盘机制前的最小可用步骤：只把已经到观察窗口的历史判断整理成“该人工复盘”的事项，不输出自动复盘结论、判断质量评价或规则修改建议。

## 当前完成状态

- Phase 6A 已完成、合入 PR #48、部署并通过 production desktop 和 390px mobile targeted QA。
- Phase 6A 本地 QA 记录：`docs/qa/runs/QA-RUN-v2026.05.17-phase-6a-local.md`。
- Phase 6A production QA 记录：`docs/qa/runs/QA-RUN-v2026.05.17-phase-6a-production.md`。
- Phase 5B 已完成、合入、部署并通过 production desktop 和 390px mobile smoke。
- Dashboard 已能生成规则化判断、可信证据、Phase 4 opportunity，并将 summary、holding、opportunity 快照写入 `dashboard_decision_snapshots`。
- `/dashboard/history` 已能读取历史判断，基于 normalized daily prices 计算 1 / 5 / 20 个交易日基础表现，展示计划状态，并派生轻量“待人工复盘”队列。
- PRD v2026.05.11 要求进入复盘与自我迭代前具备可追溯决策快照、历史表现、计划状态、复盘触发策略和用户确认边界。
- Phase 6A 未新增 schema；复盘队列从已有 history snapshot 派生，后续如进入 Phase 6B 的 review outcome 持久化，必须重新过 Planner gate。

## 0. Planner Gate

Goal：

- 在 `/dashboard/history` 顶部展示一个克制的“待人工复盘”队列，让用户快速看到哪些历史判断已经到 1 / 5 / 20 个交易日观察窗口，值得打开证据和价格表现进行人工复盘。

Scope：

- 包含从 `DashboardHistoryEntry.outcomes`、`planStatus`、原始 action/evidence/data quality 派生 review tasks。
- 包含 `ready`、`pending`、`insufficient_data` 三类复盘任务状态。
- 包含按优先级排序：已到观察窗口且计划已触发/失效优先，其次 opportunity/holding，summary 最低。
- 包含 `/dashboard/history` 顶部轻量队列 UI，单项展示原始判断、窗口、价格表现、计划状态、依据日、数据质量和证据计数。
- 包含 targeted tests 和 390px local smoke。
- 明确不包含 AI summaries、自动复盘结论、成功/失败标签、规则有效/无效判断、规则修改建议、用户确认后的规则版本管理、broker sync、真实交易、主动推送、分钟级/秒级行情、全市场推荐或完整回测系统。

Plan：

1. 新增 review task 类型和纯函数，从 history entries 派生待复盘任务。
2. 扩展 `DashboardHistorySnapshot`，加入 `reviewTasks`，不新增数据库表或迁移。
3. 在 `createDashboardHistorySnapshot` 中调用 review task 派生逻辑。
4. 在 `/dashboard/history` 顶部展示“待人工复盘”队列，并保留完整历史列表。
5. 补齐 server 和 component targeted tests，显式防止自动结论文案。
6. 跑 targeted tests、`pnpm check`、本地 390px smoke，再走 Reviewer gate。

Validation：

```bash
pnpm test src/server/dashboard/review-tasks.test.ts src/server/dashboard/history.test.ts src/components/dashboard/dashboard-history-view.test.ts
pnpm check
pnpm build
```

本地 smoke：

- `/dashboard/history` desktop：顶部显示待人工复盘队列，不影响历史判断卡片。
- `/dashboard/history` 390px：队列卡片、badge、长 symbol、long rule version 不横向溢出。
- 文案检查：不出现 `成功`、`失败`、`规则有效`、`规则无效`、`自动复盘结论`、`建议修改规则`。

Risks：

- Phase 边界：Phase 6A 是“触发人工复盘队列”，不是“复盘结论”。所有文案必须表达为“已到观察窗口 / 等待数据 / 数据不足”。
- 数据一致性：队列必须基于 persisted snapshot context 和 normalized daily prices，不能读取 provider raw payload。
- 数据不足：缺少 `instrumentId`、`basisDate`、entry close、outcome close 或价格序列断裂时，必须显示 `insufficient_data` 或 `pending`，不能硬算。
- Schema 风险：如果实现中发现必须持久化 review task 或 review outcome，应停止并重新过 Planner gate，不能顺手加表。
- UI 风险：历史页已有信息密度较高，队列必须简短，不把页面改成复盘详情页。

Handoff：

- Main Agent 执行实现。
- Explorer 仅在实现前发现 history/repository/schema 依赖不清时使用，默认不需要。
- Reviewer gate 必须检查 phase boundary、normalized data 依赖、无 schema drift、无自动结论文案、390px 布局。
- QA 合并部署后做 post-merge targeted QA，重点覆盖 `/dashboard/history` production desktop 和 390px。

## 1. 技术摸底结果

- `src/server/dashboard/types.ts` 已有 `DashboardHistoryEntry`、`DashboardHistoryOutcomeWindow`、`DashboardPlanStatusSnapshot` 和 `DashboardHistorySnapshot`。
- `src/server/dashboard/history-outcomes.ts` 已计算 1 / 5 / 20 trading-day outcome，状态为 `ready`、`pending`、`insufficient_data`。
- `src/server/dashboard/history.ts` 已组装 history entries，并能把 normalized market data 关联到 persisted decision snapshots。
- `src/components/dashboard/dashboard-history-view.tsx` 已展示 history header、entry card、plan status、outcome blocks 和 evidence summary，适合在 header 后、entries 前增加队列区。
- `src/components/dashboard/dashboard-history-view.test.ts` 已有防止 `成功`、`失败`、`规则有效`、`规则无效` 文案的断言，应继续扩展。
- `src/db/schema.ts` 已有 `dashboard_decision_snapshots`；Phase 6A 不改 schema、不新增 migration。

## 2. 文件结构

- Create: `src/server/dashboard/review-tasks.ts`
  - 负责从 `DashboardHistoryEntry[]` 派生 `DashboardReviewTaskSnapshot[]`。
  - 不访问数据库、不读取 provider raw payload、不产生复盘结论。
- Create: `src/server/dashboard/review-tasks.test.ts`
  - 覆盖 ready / pending / insufficient task 派生、排序、消息、边界文案。
- Modify: `src/server/dashboard/types.ts`
  - 增加 review task 类型，并在 `DashboardHistorySnapshot` 上增加 `reviewTasks`。
- Modify: `src/server/dashboard/history.ts`
  - 在 entries 创建后调用 `createDashboardReviewTasks(entries)`。
- Modify: `src/server/dashboard/history.test.ts`
  - 断言 history snapshot 包含 reviewTasks，且 empty state 返回空队列。
- Modify: `src/components/dashboard/dashboard-history-view.tsx`
  - 增加 `ReviewTaskQueue` UI，复用现有 `Badge`、`Card`、`MetaLine` 和格式化函数风格。
- Modify: `src/components/dashboard/dashboard-history-view.test.ts`
  - 断言队列渲染、空队列状态、边界文案不出现。
- Optional docs after implementation: `docs/qa/runs/QA-RUN-v2026.05.17-phase-6a-local.md`
  - 仅在本地 smoke 完成后记录。

## 3. 建议类型草案

```ts
export type DashboardReviewTaskStatus =
  | "insufficient_data"
  | "pending"
  | "ready";

export type DashboardReviewTaskWindow = DashboardHistoryOutcomeTradingDays;

export type DashboardReviewTaskSnapshot = {
  actionKind: DashboardActionKind;
  actionLabel: string;
  basisDate: string | null;
  confidence: DashboardConfidence;
  dataQuality: DashboardDataQuality;
  entryClose: number | null;
  entryDate: string | null;
  id: string;
  instrumentId: string | null;
  message: string;
  outcomeClose: number | null;
  outcomeDate: string | null;
  planStatus: DashboardPlanStatusSnapshot;
  priority: number;
  returnPercent: number | null;
  ruleVersion: string;
  scope: DashboardDecisionSnapshotScope;
  snapshotDate: string;
  status: DashboardReviewTaskStatus;
  subjectKey: string;
  symbol: string | null;
  tradingDays: DashboardReviewTaskWindow;
};
```

`id` 建议格式：

```ts
`${entry.snapshotDate}:${entry.scope}:${entry.subjectKey}:${entry.ruleVersion}:${outcome.tradingDays}`
```

## 4. 派生规则

- 对每条 history entry 的每个 outcome 生成一个 review task。
- `ready`：窗口已经观察到 outcome close，可进入人工复盘。
- `pending`：entry close 已有，但还没到该交易日窗口。
- `insufficient_data`：缺少关联标的、basis date、entry close、outcome close 或 normalized price 序列不可靠。
- 默认最多展示 12 个 task，避免历史页顶部过重。
- 排序建议：
  1. `ready` 在前，`pending` 次之，`insufficient_data` 最后。
  2. `planStatus.status` 为 `triggered` 或 `invalidated` 的 `ready` task 优先。
  3. `opportunity` 优先于 `holding`，`summary` 最后。
  4. 观察窗口短的优先：1D、5D、20D。
  5. `snapshotDate` 新的优先。

## 5. 推荐实现顺序

1. 写 `src/server/dashboard/review-tasks.test.ts`，覆盖 empty、ready、pending、insufficient、priority sort。
2. 实现 `src/server/dashboard/review-tasks.ts` 的最小纯函数。
3. 扩展 `src/server/dashboard/types.ts` 和 `src/server/dashboard/history.ts`，让 history snapshot 返回 reviewTasks。
4. 更新 `src/server/dashboard/history.test.ts`。
5. 更新 `src/components/dashboard/dashboard-history-view.test.ts`，先断言队列内容和禁止文案。
6. 实现 `ReviewTaskQueue` UI。
7. 跑 targeted tests。
8. 跑 `pnpm check` 和 `pnpm build`。
9. 本地启动 `pnpm dev`，检查 `/dashboard/history` desktop 和 390px。
10. 走 Reviewer gate；合并部署后做 production targeted QA。

## 6. Acceptance Criteria

- `/dashboard/history` 顶部显示“待人工复盘”队列。
- 队列由 existing history entries 和 normalized daily price outcomes 派生，不新增 schema。
- `ready` task 明确表达“已到观察窗口，可人工复盘”。
- `pending` task 明确表达“等待 X 个交易日后的 normalized price”。
- `insufficient_data` task 明确表达缺失原因。
- task 卡片展示原始判断、symbol、scope、窗口、return percent、entry/outcome price、计划状态、数据质量和规则版本。
- 页面不输出自动复盘结论、成功/失败、规则有效/无效或规则修改建议。
- 390px mobile 无横向溢出。
- Targeted tests、`pnpm check`、`pnpm build` 通过。

## 7. Out Of Scope

- `review_tasks` 数据表。
- `review_outcomes` 数据表。
- `rule_change_proposals` 数据表。
- 用户确认/拒绝/暂缓 UI。
- benchmark 对比 SPY/QQQ/BTC。
- AI 生成复盘卡片。
- 自动判断质量评价。
- 自动规则变更或权重调整建议。
- 标的详情页。
- 交易执行、broker sync、推送或高频行情。

## 8. QA Plan

Post-merge targeted QA 覆盖：

- Production `/dashboard/history` desktop：队列显示，历史卡片仍显示。
- Production `/dashboard/history` 390px：无横向溢出。
- 文案边界：不出现 `成功`、`失败`、`规则有效`、`规则无效`、`自动复盘结论`、`建议修改规则`。
- Empty state：无 history entries 时显示空队列/空历史，不崩溃。
- Console：无明显 warning/error。

## 9. Done Criteria

- Phase 6A 实现完成并通过 targeted tests、`pnpm check`、`pnpm build`。
- 本地 `/dashboard/history` desktop 和 390px smoke 通过。
- Reviewer gate 无 blocking issue。
- PR 合并并完成 Vercel production deploy。
- Production targeted QA 完成并记录在 `docs/qa/runs/`。
- `docs/context-map.md`、`AGENTS.md` 和本计划状态更新为 Phase 6A 完成态。

## 10. 当前下一步

Phase 6A 已完成本地实现、targeted tests、`pnpm check`、`pnpm build`、local desktop/390px smoke、review/PR/merge/deploy、production desktop/390px targeted QA 和状态文档同步。
