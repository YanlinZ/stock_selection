# Dashboard Service 小范围结构整理计划

版本：v2026.05.15-dashboard-service-structure-refactor

本文件路径：`docs/tech/TECH-PLAN-v2026.05.15-dashboard-service-structure-refactor.md`

## 0. 结论

当前不做大重构。Phase 4 Watchlist Opportunity Scan 已完成、部署并通过生产 smoke；现阶段没有需要暂停产品节奏的大型结构风险。

2026-05-15 更新：本文件记录的小范围结构整理已完成并合入 `main`。

- PR #35：`https://github.com/yanlin-zhou/stock-selection/pull/35`
- Merge commit：`3df8e1a684086b15dffc41c5ed8f601ce5dff9ec`
- `src/server/dashboard/service.ts` 已收敛为 public facade / orchestration 入口。
- Dashboard server 规则已拆入 `snapshot.ts`、`target-decisions.ts`、`opportunity-scan.ts`、`data-sources.ts`、`decision-snapshots.ts` 和 `shared.ts`。
- 行为口径未改变：没有 UI、schema、migration、规则阈值、`dashboardRuleVersion` 或产品能力变化。
- 验证已通过：定向 Dashboard 测试、`pnpm check`、Vercel deploy checks、post-merge production deploy status 和 production `/api/health` smoke。

建议在进入新的 Dashboard 复杂能力前，先做一次小而窄的结构整理，目标是降低 `src/server/dashboard/service.ts` 的继续扩展成本，而不是改变产品行为。

这次整理应被视为内部代码组织工作：

- 不新增交易能力。
- 不修改推荐规则、阈值、文案或 UI 行为。
- 不改 schema 或 migration。
- 不改变 Dashboard 对 normalized data 的依赖边界。
- 不改变每日最多 0-1 个机会的 Phase 4 约束。

## 1. 触发条件

只有满足以下条件之一时，才建议执行本整理：

- 准备进入新的 Dashboard 复杂能力，例如复盘、更多规则维度、用户确认后的规则建议、或更细的机会解释。
- `src/server/dashboard/service.ts` 继续增加业务规则，导致新改动需要同时理解 snapshot、target action、opportunity、evidence、data sources 和 decision snapshots。
- Reviewer 明确指出 Dashboard service 可维护性已成为后续开发风险。

以下情况不建议执行：

- 只是修一个小 bug。
- 只是改 UI 文案或样式。
- 只是更新文档、QA 记录或 README。
- 当前分支还存在未收口的功能行为变更。

## 2. 当前结构压力

主要压力集中在：

- `src/server/dashboard/service.ts`
  - 当前承担 snapshot 组装、target action、evidence、data source、opportunity scan、daily decision snapshot record 等职责。
  - 文件偏大，后续继续扩 Dashboard 规则时容易形成“所有规则都塞进一个文件”的惯性。
- `src/components/dashboard/dashboard-view.tsx`
  - 文件也偏大，但主要是展示组件拆函数，短期风险低于 server service。
- `src/app/(protected)/settings/page.tsx`
  - 文件偏大，但 Settings 当前已稳定，除非下一阶段继续改 Settings，否则不作为本次优先对象。

本次推荐只优先整理 Dashboard server service。Dashboard UI 和 Settings 页面可以后置。

## 3. 目标

整理后的目标状态：

- `src/server/dashboard/service.ts` 保持为薄的 public facade / orchestration 入口。
- 规则计算按职责拆到少数内部模块。
- 现有 public exports 保持稳定，避免波及 app/page、tests 和其他调用方。
- 现有测试不需要大规模重写。
- 行为保持完全一致，测试快照和业务断言继续通过。

建议保留的 public API：

- `createDashboardService`
- `createDashboardSnapshot`
- `createUnavailableDashboardSnapshot`
- `createDailyDecisionSnapshotRecords`
- `dashboardRuleVersion`

## 4. 建议目标路径

推荐新增以下内部模块，路径都在 `src/server/dashboard/` 下：

- `src/server/dashboard/snapshot.ts`
  - 负责 `createDashboardSnapshot` 的纯函数组装。
  - 包含 active instruments 合并、market/key level grouping、freshness、dashboard status、summary action、key level alerts 等 snapshot-level helper。
- `src/server/dashboard/target-decisions.ts`
  - 负责 `createTargetSnapshot`、target action、target evidence、target data quality、confidence/trust action 等单标的判断。
- `src/server/dashboard/opportunity-scan.ts`
  - 负责 Phase 4 opportunity summary、candidate evaluation、score、ranking、disqualified reasons、empty opportunity action。
- `src/server/dashboard/data-sources.ts`
  - 负责 price / technical / macro / configuration / ingestion / opportunity / summary data source builders。
- `src/server/dashboard/decision-snapshots.ts`
  - 负责 `createDailyDecisionSnapshotRecords`、safe macro/key level snapshots、fallback evidence、summary data sources。

保留：

- `src/server/dashboard/service.ts`
  - 只负责 repository orchestration、optional persistence、导出 public API。
  - 可以 re-export 从新模块迁出的 pure functions，以降低调用方改动。
- `src/server/dashboard/types.ts`
  - 继续作为 Dashboard 类型契约入口。
- `src/server/dashboard/indicators.ts`
  - 保持不动。
- `src/server/dashboard/macro-scoring.ts`
  - 保持不动。
- `src/server/dashboard/repository.ts`
  - 保持不动，除非发现 import 路径必须微调。

不要新建太多细碎模块。若执行中发现某个模块只有 20-30 行且只被一个文件使用，优先留在调用文件里。

## 5. 推荐执行顺序

### 5.1 建立基线

先运行定向测试，确认 refactor 前是绿的：

```bash
pnpm test src/server/dashboard/service.test.ts src/server/dashboard/indicators.test.ts src/server/dashboard/macro-scoring.test.ts src/components/dashboard/dashboard-view.test.ts
```

如果基线不绿，先停止，不要开始结构整理。

### 5.2 抽出 decision snapshots

第一步优先抽出低耦合区域：

- 从 `service.ts` 迁出 `createDailyDecisionSnapshotRecords` 及其私有 helper。
- 新文件：`src/server/dashboard/decision-snapshots.ts`。
- `service.ts` 从新文件 import，并继续 re-export `createDailyDecisionSnapshotRecords`。

验收：

- `createDailyDecisionSnapshotRecords` 的现有测试无需改断言。
- 快照仍不包含 raw provider payload、secret、cookie、长错误日志。
- `createDashboardService().getDashboardSnapshot()` 的 persistence fallback 行为不变。

### 5.3 抽出 opportunity scan

第二步抽出 Phase 4 opportunity 逻辑：

- 新文件：`src/server/dashboard/opportunity-scan.ts`。
- 迁出 `createOpportunitySummary`、candidate evaluation、score/rank、empty opportunity summary、opportunity data source 或相关 helper。
- 如果 data source helper 会被 target 和 summary 共用，可以先放到 `data-sources.ts`，避免 opportunity module 依赖 service 私有函数。

验收：

- 每日最多 1 个机会不变。
- 无机会状态不变。
- partial / stale / unavailable 不能产生强机会。
- weak single-signal、macro elevated hard exclusion、both-role dedupe 测试继续通过。

### 5.4 抽出 target decisions

第三步抽出单标的判断：

- 新文件：`src/server/dashboard/target-decisions.ts`。
- 迁出 `createTargetSnapshot`、`createTargetAction`、`createTargetEvidence`、`createUnavailableEvidence`、`createTrustAction`、confidence/data quality 相关 helper。
- 保持 `DashboardTargetSnapshot` 的 shape 不变。

验收：

- holding action 的 `confidence`、`dataQuality`、`dataSources`、四组 evidence、`ruleVersion` 不变。
- stale、partial、unavailable 降级行为不变。
- `reasons` / `risks` 兼容字段不变。

### 5.5 抽出 data sources

如果前面抽取时 data source helper 被多个模块共享，再抽出：

- 新文件：`src/server/dashboard/data-sources.ts`。
- 迁出 price / technical / macro / configuration / ingestion / opportunity / summary source builders。
- 注意不要让 UI 或 service 读取 provider raw payload。

验收：

- provider label、安全摘要、basis date、updatedAt 表达不变。
- `formatRunSummary` 仍只允许安全 summary keys。

### 5.6 收尾 service facade

最后让 `service.ts` 保持窄入口：

- `createDashboardService` 读取 repository input。
- 调用 pure snapshot builder。
- 尝试持久化 daily decision snapshots。
- 吞掉 snapshot persistence 失败，Dashboard rendering 继续成功。
- re-export 必要 public functions。

验收：

- 调用方无需知道内部拆分。
- import 关系保持单向，避免循环依赖。

## 6. 非目标

本次不做：

- 不新增 AI summaries 或 AI 解释。
- 不新增新闻/财报理解。
- 不做全市场推荐。
- 不做 broker sync、真实交易、推送、分钟级行情。
- 不改 opportunity score threshold。
- 不改 stale threshold。
- 不改 `dashboardRuleVersion`，除非行为真的改变；本次目标是不改变行为，所以默认不改。
- 不改 Drizzle schema、migration 或 production data。
- 不批量删除文件。

## 7. 验收标准

代码整理完成后必须满足：

- `src/server/dashboard/service.ts` 明显变薄，主要承担 facade/orchestration。
- Dashboard public API 不破坏。
- Phase 4 规则行为不变。
- Dashboard UI 不需要行为性改动。
- 没有 schema/migration 变更。
- 没有新增 provider raw payload 依赖。
- 没有 secret、cookie、database URL、真实账户信息进入代码、测试或文档。
- `git diff` 中没有产品能力扩张。

建议验证命令：

```bash
pnpm test src/server/dashboard/service.test.ts src/server/dashboard/indicators.test.ts src/server/dashboard/macro-scoring.test.ts src/components/dashboard/dashboard-view.test.ts
pnpm check
```

如果执行中只移动代码、不改 UI，可不强制浏览器 smoke。若 Dashboard UI import 或 rendering 受到影响，补本地 `/dashboard` smoke。

## 8. Reviewer 重点

Reviewer 应重点检查：

- 是否真的只是结构整理，没有行为漂移。
- public exports 是否保持兼容。
- opportunity scan 是否仍最多输出 0-1 个机会。
- stale / partial / unavailable 是否仍降级。
- snapshot persistence 失败是否仍不阻断 Dashboard render。
- normalized data 边界是否仍成立。
- 是否引入循环依赖或过细模块。
- 是否误改 rule version、阈值、文案、schema 或测试 fixture 语义。

## 9. 建议 handoff

交给主 Agent 执行时，建议先读：

- `AGENTS.md`
- `docs/context-map.md`
- 本文件
- `docs/tech/TECH-PLAN-v2026.05.15-phase-4-watchlist-opportunity-scan.md`
- `src/server/dashboard/service.ts`
- `src/server/dashboard/service.test.ts`
- `src/components/dashboard/dashboard-view.test.ts`

执行策略：

1. 先跑基线测试。
2. 每次只抽一个模块。
3. 每抽完一个模块就跑 Dashboard 定向测试。
4. 如果某一步开始需要改业务断言，停止并重新评估，因为这说明已经不是纯结构整理。
5. 最后跑 `pnpm check`。

## 10. 成功标准

这次整理成功时，应该很无聊：

- 用户看不到任何产品变化。
- 测试还是绿的。
- 后续 Agent 能更快定位 opportunity、target decision、data source、decision snapshot 各自的代码。
- 下一阶段 Dashboard 复杂能力不再需要继续把所有业务规则塞进 `service.ts`。
