# stock_selection 技术开发计划

版本：v2026.05.16-phase-5a-history-performance-tracking

本文件基于 Phase 4 Watchlist Opportunity Scan 完成态和 Phase 3 Dashboard Trust 的轻量判断快照能力，定义下一阶段进入开发前的技术计划。

## 当前准备状态

- Phase 5A 已选定为下一阶段开发方向：历史判断与表现追踪基础版。
- 本文件只完成开发前准备，不代表 Phase 5A 功能已经实现。
- Phase 4 已完成、合入 `main`、部署并通过 production smoke。
- Phase 3 已新增 `dashboard_decision_snapshots` 表和 Dashboard 渲染时的轻量快照持久化。
- 2026-05-15 的 Dashboard service 结构整理已完成，`src/server/dashboard/service.ts` 已收敛为 public facade / orchestration 入口，Dashboard server 规则已拆入 `snapshot.ts`、`target-decisions.ts`、`opportunity-scan.ts`、`data-sources.ts`、`decision-snapshots.ts` 和 `shared.ts`。
- 当前代码基础足以开始 Phase 5A，但仍缺少历史读取、outcome 计算、历史 UI，以及 Phase 4 opportunity 的可追踪快照覆盖。

## 相对上一阶段的关键变化

- 将下一阶段定义为 Phase 5A：History Judgment and Performance Tracking / 历史判断与表现追踪基础版。
- Phase 5A 的核心不是评价规则好坏，而是让用户能追踪历史判断、依据日期、规则版本和后续价格表现。
- Phase 5A 只计算基础表现，不输出自动复盘结论、不提出规则修改建议、不做自我迭代。
- Phase 5A 必须继续基于 normalized internal data：`dashboard_decision_snapshots`、`market_data_daily`、`instruments`，以及 Dashboard 已生成的可信证据模型。
- 如果后续价格或 benchmark 数据不足，必须显示 `pending` 或 `insufficient_data`，不能硬凑结论。

## 0. Planner Gate

Goal：

- 让用户在 Dashboard 之后可以回看过去的重要规则化判断，并看到后续 1 / 5 / 20 个交易日的基础表现。
- 为未来完整复盘打基础，但不进入自动复盘、自我迭代或规则建议。

Scope：

- 包含历史判断读取、Phase 4 opportunity 快照覆盖、基础 outcome 计算、历史判断 UI、targeted tests、本地 smoke 和文档状态更新。
- 历史表现只展示事实性结果：价格变化、可用观察窗口、数据是否足够、可选 benchmark 对比。
- 保留原判断的 action、confidence、dataQuality、dataSources、evidence、basisDate、ruleVersion 和 generatedAt。
- 明确不包含 AI summaries / AI 解释、自动复盘结论、自动规则修改、用户确认式规则变更、broker sync、真实交易、主动推送、分钟级/秒级行情、全市场推荐、完整回测系统。

Plan：

1. 补齐历史追踪契约：扩展 snapshot scope，保证 summary、holding 和 Phase 4 opportunity 都能进入历史追踪。
2. 新增 Dashboard history repository/service，默认读取最近 30 天或最近 50 条判断快照，并用 normalized market data 计算观察窗口结果。
3. 实现 outcome 计算规则：1 / 5 / 20 个交易日价格变化，数据不足时明确 pending 或 insufficient。
4. 增加历史判断 UI，建议优先放在 `/dashboard/history`，并在 Dashboard 提供轻入口。
5. 补齐 targeted service/UI tests，覆盖数据足够、数据不足、opportunity 快照和 no-opportunity 不误判。
6. 跑定向测试、`pnpm check`、本地 browser smoke，再走 Reviewer gate。

Validation：

- 迭代中优先跑新增 history service tests、Dashboard snapshot tests 和 history UI tests。
- 合并前跑 `pnpm check`。
- 本地 browser smoke 覆盖 `/dashboard` 和 `/dashboard/history`：有历史记录、无历史记录、pending outcome、insufficient outcome、移动端宽度。

Risks：

- 最大风险是滑向 Phase 6：自动复盘、自我迭代或规则改进建议。Phase 5A 只能展示事实性历史表现。
- 价格表现不是判断质量结论。UI 文案必须避免把“涨跌结果”包装成“规则有效/无效”。
- 当前快照 scope 只有 `summary` 和 `holding`；如果不补 opportunity scope，Phase 4 最关键能力会无法追踪。
- benchmark 数据可能缺失，必须可选降级。
- Dashboard 渲染时持久化快照失败仍不能阻断 Dashboard 页面。

Handoff：

- Main Agent 负责实施和集成。
- Explorer Agent 可在实现前 read-only 确认 `market_data_daily` 查询、history UI 插入点和 existing tests。
- Reviewer Agent 在 diff 完成后做 read-only gate，重点审 phase 边界、normalized data 依赖、历史结果解释文案、snapshot 安全边界和测试覆盖。
- QA Agent 或 Main Agent 做本地 Dashboard/history smoke；production QA 在合并部署后按需补充。

## 1. 技术摸底结果

当前基础能力：

- `src/db/schema.ts` 已定义 `dashboardDecisionSnapshots`，包含 `snapshotDate`、`scope`、`subjectKey`、`instrumentId`、`symbol`、`actionKind`、`actionLabel`、`confidence`、`dataQuality`、`basisDate`、`dataSources`、`evidence`、`keyLevels`、`macroState`、`ruleVersion`、`generatedAt`。
- `drizzle/0002_talented_bishop.sql` 已创建 `dashboard_decision_snapshots` 表、唯一键和索引。
- `src/server/dashboard/decision-snapshots.ts` 已提供 `createDailyDecisionSnapshotRecords(snapshot)`。
- `src/server/dashboard/repository.ts` 已提供 `persistDailyDecisionSnapshots`，使用 `snapshotDate + scope + subjectKey + ruleVersion` upsert。
- `src/server/dashboard/service.ts` 已在 Dashboard snapshot 生成后尝试持久化 daily decision snapshots，且 persistence 失败不阻断 Dashboard 渲染。
- `src/server/dashboard/types.ts` 已定义 `DashboardDecisionSnapshotRecord` 和 `DashboardDecisionSnapshotScope`。
- `src/server/dashboard/opportunity-scan.ts` 已生成 Phase 4 opportunity summary，但当前快照持久化未覆盖 opportunity。
- `src/components/dashboard/dashboard-view.tsx` 已显示 Phase 4 opportunity 和 Phase 3 trust evidence。

主要缺口：

- `DashboardDecisionSnapshotScope` 当前只有 `"summary" | "holding"`，不能表达 Phase 4 今日机会。
- 没有从 `dashboard_decision_snapshots` 读取历史判断的 repository/service。
- 没有将历史判断和 `market_data_daily` 后续价格关联起来的 outcome calculator。
- 没有历史判断 UI 或路由。
- 没有 benchmark 对比契约；Phase 5A 可以先只支持 optional benchmark，数据缺失时降级。
- 没有针对历史判断追踪的测试。

## 2. 本阶段目标

Phase 5A 完成后，产品应能回答：

- 过去几天 Dashboard 给过哪些重要规则化判断？
- 当时的 action、confidence、dataQuality、basis date 和 rule version 是什么？
- 这个判断后 1 / 5 / 20 个交易日，标的价格发生了什么？
- 当前观察窗口是 ready、pending 还是 insufficient data？
- Phase 4 今日机会是否被纳入历史追踪？

Phase 5A 不回答：

- 这条规则是否应该修改。
- 这次判断质量是否高或低。
- 系统是否应该自动学习。
- 用户是否应该因为历史结果改变交易动作。

## 3. In Scope

### 3.1 历史快照契约

推荐修改：

- `src/server/dashboard/types.ts`
  - 将 `DashboardDecisionSnapshotScope` 扩展为 `"summary" | "holding" | "opportunity"`。
  - 新增 history 读取 DTO，例如 `DashboardHistorySnapshotRecord`、`DashboardHistoryOutcomeWindow`、`DashboardHistoryEntry`、`DashboardHistorySnapshot`。
- `src/server/dashboard/decision-snapshots.ts`
  - `createDailyDecisionSnapshotRecords` 继续生成 summary 和 holding records。
  - 当 `snapshot.opportunity.status === "available"` 且有 candidate 时，生成一条 `scope: "opportunity"` 的 record。
  - no-opportunity 状态默认不保存为 opportunity record，避免历史页变成“每日无机会列表”。summary record 已能表达总体状态。

验收：

- Phase 4 available opportunity 能被持久化。
- 每日最多 1 个 opportunity record。
- subject key 使用 candidate instrument id，保持和 holding 去重逻辑兼容。
- 快照不保存 provider raw payload、secret、cookie、database URL、真实账户信息或长日志。

### 3.2 历史读取 repository/service

推荐新增：

- `src/server/dashboard/history.ts`
  - 负责 pure history 组装和 outcome 计算调用。
  - 暴露 `createDashboardHistorySnapshot(input, options)` 或同等纯函数，便于测试。
- `src/server/dashboard/history-outcomes.ts`
  - 负责 1 / 5 / 20 个交易日 outcome 计算。
  - 输入为 snapshot record 和对应 instrument 的 sorted `market_data_daily`。
  - 输出 window status：`ready`、`pending`、`insufficient_data`。
- `src/server/dashboard/history-service.ts`
  - 负责 repository orchestration。
  - 可以由 `src/server/dashboard/service.ts` re-export 或保持独立 export。

推荐修改：

- `src/server/dashboard/repository.ts`
  - 增加 `getDashboardHistoryInputs(options)`。
  - 默认查询最近 30 天或最近 50 条 `dashboard_decision_snapshots`。
  - 查询相关 `instrumentId` 的 `market_data_daily`，仅使用 normalized daily data。
  - 默认按 `snapshotDate desc, generatedAt desc, scope asc, symbol asc` 排序。

验收：

- 无历史记录时返回稳定空状态。
- 有历史记录但缺后续价格时返回 pending 或 insufficient，不抛错。
- Dashboard render 的现有 repository path 不回退。

### 3.3 Outcome 计算

推荐窗口：

- 1 个交易日。
- 5 个交易日。
- 20 个交易日。

推荐规则：

- entry price 使用 `basisDate` 当日或之后第一个可用交易日 close。
- outcome price 使用 entry date 后第 N 个可用交易日 close。
- 如果 snapshot 太新，窗口未到，输出 `pending`。
- 如果历史价格缺 entry price 或中间数据断裂明显，输出 `insufficient_data`。
- `returnPercent = (outcomeClose - entryClose) / entryClose * 100`。
- benchmark 对比只在同一窗口 benchmark 数据可用时输出；不可用时显示 benchmark unavailable，不阻断主结果。

验收：

- 不用自然日硬算交易日。
- 不使用 provider raw payload。
- 不把价格结果转化成“判断正确/错误”。
- 所有 percentage formatting 保持可读，长 symbol 和空值不会破坏 UI。

### 3.4 历史判断 UI

推荐新增：

- `src/app/(protected)/dashboard/history/page.tsx`
  - server component，调用 history service。
- `src/components/dashboard/dashboard-history-view.tsx`
  - 展示历史判断列表和 outcome windows。
- `src/components/dashboard/dashboard-history-view.test.ts`
  - server-render/static markup 测试。

推荐修改：

- `src/components/dashboard/dashboard-view.tsx`
  - 增加一个克制入口到 `/dashboard/history`，例如 Dashboard 顶部或 data freshness 附近的链接。
- `src/components/protected-navigation.tsx`
  - 如果现有导航需要可发现性，可以增加 History 链接；若导航空间不足，先只放 Dashboard 内入口。

UI 要求：

- 历史页不是复盘页，不使用“成功/失败”“规则有效/无效”作为结论。
- 每条记录展示 date、symbol/scope、action label、confidence、dataQuality、basis date、ruleVersion、1/5/20 日表现状态。
- evidence 可折叠或摘要展示，避免历史页变成完整 Dashboard 复制。
- 空状态明确说明还没有可追踪历史判断。
- 360px、390px、414px 下无横向溢出。

### 3.5 Tests

推荐新增或修改测试：

- `src/server/dashboard/service.test.ts`
  - 补 opportunity snapshot record 断言。
- `src/server/dashboard/history-outcomes.test.ts`
  - 覆盖 ready、pending、insufficient_data、entry price fallback、百分比计算。
- `src/server/dashboard/history.test.ts`
  - 覆盖历史 entries 组装、排序、scope filtering、无历史记录。
- `src/components/dashboard/dashboard-history-view.test.ts`
  - 覆盖空状态、ready outcome、pending outcome、insufficient outcome。
- `src/components/dashboard/dashboard-view.test.ts`
  - 覆盖 Dashboard 到 history 的轻入口不会破坏 unavailable snapshot 渲染。

推荐定向命令：

```bash
pnpm test src/server/dashboard/service.test.ts src/server/dashboard/history-outcomes.test.ts src/server/dashboard/history.test.ts src/components/dashboard/dashboard-history-view.test.ts src/components/dashboard/dashboard-view.test.ts
```

合并前命令：

```bash
pnpm check
```

## 4. Out Of Scope

Phase 5A 不做：

- 不做 AI summaries 或 AI 解释层。
- 不做完整复盘页面。
- 不做自动复盘结论。
- 不做 rule change proposal。
- 不做用户确认式规则更新。
- 不做自动学习、自我迭代或未经确认的规则修改。
- 不做 broker sync。
- 不做真实交易或下单。
- 不做主动推送。
- 不做分钟级/秒级行情。
- 不做全市场推荐。
- 不做完整历史回测系统。
- 不让 UI 依赖 provider raw payload。
- 不把 outcome 当作交易建议。

## 5. 推荐实施顺序

### 5.1 基线与契约测试

- 先跑当前 Dashboard 定向测试：

```bash
pnpm test src/server/dashboard/service.test.ts src/components/dashboard/dashboard-view.test.ts
```

- 在 `src/server/dashboard/service.test.ts` 中新增 opportunity snapshot record 的失败断言。
- 扩展 `DashboardDecisionSnapshotScope` 和 `createDailyDecisionSnapshotRecords`。

验收：

- summary、holding 快照行为不变。
- available opportunity 生成 1 条 `scope: "opportunity"` 快照。
- no-opportunity 不生成 opportunity 快照。

### 5.2 Outcome calculator

- 新增 `src/server/dashboard/history-outcomes.ts`。
- 新增 `src/server/dashboard/history-outcomes.test.ts`。
- 先用纯函数实现 1 / 5 / 20 个交易日窗口，避免先接 repository。

验收：

- 价格数据充足时输出 ready。
- snapshot 太新时输出 pending。
- basis price 缺失或价格序列不足时输出 insufficient_data。

### 5.3 History assembler

- 新增 `src/server/dashboard/history.ts`。
- 新增 `src/server/dashboard/history.test.ts`。
- 将 raw DB rows 映射为 UI 友好的 history snapshot。

验收：

- 空历史稳定渲染。
- scope、symbol、ruleVersion、basisDate、confidence、dataQuality 不丢失。
- outcome 只表达事实，不输出质量评价。

### 5.4 Repository/service 集成

- 修改 `src/server/dashboard/repository.ts`，增加历史读取方法。
- 新增 `src/server/dashboard/history-service.ts` 或在 `service.ts` re-export history service。
- 保持现有 `createDashboardService().getDashboardSnapshot()` 行为不变。

验收：

- 历史读取只依赖 normalized tables。
- Dashboard 页面不因 history path 变更而回退。
- 查询范围有限制，默认最近 30 天或最近 50 条 records，避免无界读取。

### 5.5 UI 集成

- 新增 `/dashboard/history` 页面和 `DashboardHistoryView`。
- 在 Dashboard 增加轻入口。
- 用已有 `Badge`、`Card`、`Button` 样式，保持 Dashboard 工具型界面，不做营销式 hero。

验收：

- 有历史、无历史、pending、insufficient 都可读。
- evidence 文本长时换行。
- 移动端无横向溢出。

### 5.6 收尾、review 与 QA

- 运行定向 tests。
- 运行 `pnpm check`。
- 本地 `pnpm dev` 后 smoke `/dashboard` 和 `/dashboard/history`。
- 交 Reviewer gate。

验收：

- Reviewer 无 blocking issue。
- 若有 UI 变更，记录本地 smoke 结果到 `docs/qa/runs/`。
- 若最终实现改变 active state，更新 `AGENTS.md` 和 `docs/context-map.md`。

## 6. 验收标准

- 历史页或历史入口可以展示历史判断记录。
- Phase 4 available opportunity 被纳入历史追踪。
- 1 / 5 / 20 个交易日 outcome 使用 normalized daily price data 计算。
- 数据不足时显示 pending 或 insufficient_data。
- UI 不输出自动复盘结论，不提出规则修改建议。
- Dashboard 现有 Phase 4 opportunity、summary、holding trust evidence 不回退。
- 相关 service/UI tests 通过。
- 合并前 `pnpm check` 通过，或若因环境限制跳过，必须记录原因。

## 7. Validation Plan

定向测试：

```bash
pnpm test src/server/dashboard/service.test.ts src/server/dashboard/history-outcomes.test.ts src/server/dashboard/history.test.ts src/components/dashboard/dashboard-history-view.test.ts src/components/dashboard/dashboard-view.test.ts
```

合并前检查：

```bash
pnpm check
```

本地 smoke：

```bash
pnpm dev
```

浏览器检查：

- `/dashboard`：Phase 4 今日机会和无机会状态仍正常。
- `/dashboard/history` 无历史记录：显示稳定空状态。
- `/dashboard/history` 有历史记录：显示 date、symbol/scope、action、confidence、dataQuality、basis date、ruleVersion。
- `/dashboard/history` ready outcome：显示 1 / 5 / 20 个交易日表现。
- `/dashboard/history` pending/insufficient：明确显示数据未到或不足，不输出结论。
- 360px、390px、414px：历史卡片可读，无横向溢出。

## 8. 风险与约束

- Phase 边界：Phase 5A 是追踪，不是复盘；不做规则建议或自动学习。
- 数据解释：短期价格涨跌不能直接代表判断质量。
- 数据一致性：snapshotDate、basisDate、generatedAt、market data date 必须分别表达。
- 快照覆盖：opportunity 必须进入可追踪历史，否则 Phase 4 能力无法形成闭环。
- 查询范围：历史读取必须有默认 limit，避免 Dashboard history 变慢。
- 安全边界：不得保存或展示 secrets、cookies、raw provider payload、database URL、真实账户敏感信息或长日志。

## 9. 完成定义

Phase 5A 实现完成时应满足：

- 快照契约覆盖 summary、holding、opportunity。
- 历史读取 service 和 outcome calculator 已实现并有 targeted tests。
- 历史 UI 已实现并通过本地 smoke。
- Dashboard 现有用户路径不回退。
- `pnpm check` 通过。
- Diff 经 Reviewer gate 通过，无 blocking issue。
- 需要部署时，PR checks 全部通过并完成 post-merge production smoke。

## 10. 当前下一步

2026-05-16 准备状态：

- Phase 5A 已完成 planning gate 和开发前技术计划。
- 下一步可以由 Main Agent 按本文件开始实现。
- 实现前先跑 Dashboard 定向基线测试。
- 若实现中发现需要新增 schema，例如独立 review task 或 outcome table，应停止并重新过 Planner gate；Phase 5A 默认优先不新增 schema，先用 existing snapshots + normalized market data 计算展示。
