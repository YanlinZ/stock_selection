# stock_selection 技术开发计划

版本：v2026.05.15-phase-4-watchlist-opportunity-scan

本文件基于 Phase 3 Dashboard Trust 完成态和 2026-05-15 production closure retest 结果，规划下一阶段 MVP 内产品扩展。

`docs/tech/TECH-PLAN-v2026.05.14-phase-3-dashboard-trust.md` 继续作为 Dashboard Trust 完成状态与验收口径记录有效。本文件是 Phase 4 执行入口。

## 相对上一版的关键变化

- 将下一阶段定义为 Phase 4：Watchlist Opportunity Scan / 关注列表规则化机会扫描。
- Phase 4 的核心不是增加推荐数量，而是在持仓和关注列表范围内少错过真正值得看的大跌反弹机会。
- 继续复用 Phase 3 的可信层：confidence、dataQuality、dataSources、supporting/opposing/risks/missing evidence 和 ruleVersion。
- 每日最多突出 0-1 个高质量机会；没有高质量机会时必须明确保持观察/不操作。
- 不进入 AI summaries、新闻/财报深度理解、全市场推荐、推送、券商同步、高频行情、真实交易、完整复盘或自动学习。

## 0. Planner Gate

Goal：

- 让用户打开 Dashboard 时，除了可信地理解持仓判断，也能快速知道关注列表里今天是否有一个值得重点看的规则化机会。
- 机会扫描必须克制、可解释、可降级；数据不足时不能输出强机会。

Scope：

- 包含持仓/关注列表内的规则化异常机会扫描、机会 action、证据分组、可信标签、Dashboard UI 展示、targeted tests 和本地 smoke。
- 可复用或轻量扩展 `dashboard_decision_snapshots`，但默认不新增 schema，除非实现中证明 watchlist opportunity 快照必须独立保存。
- 明确不包含 AI summaries / AI 解释、新闻/财报深度理解、自动定时任务、券商同步、真实交易、主动推送、分钟级/秒级行情、全市场推荐、完整复盘页面、自我迭代或自动规则修改。

Plan：

1. 定义机会扫描契约与硬排除规则。
2. 扩展 Dashboard service，为 watchlist/both targets 生成 opportunity candidate。
3. 将候选收敛到每日 0-1 个最高质量机会，并保留无机会状态。
4. 在 Dashboard 顶部或关注列表区域展示机会卡片，复用 Phase 3 可信证据模型。
5. 补齐 targeted service/UI tests。
6. 跑本地 smoke 和 `pnpm check`，再走 review gate。

Validation：

- 迭代中跑 Dashboard service、indicators、macro scoring 和 Dashboard UI 的定向测试。
- 合并前跑 `pnpm check`。
- 本地 browser smoke 覆盖 `/dashboard`：无机会、1 个机会、多个候选只显示最高质量、stale/partial 数据降级、360px/390px/414px。

Risks：

- 最大风险是自然滑向推荐更多标的。Phase 4 必须保持每日最多 1 个机会，且允许多数日子无机会。
- 关注列表缺少基本面/新闻输入时，机会只能基于宏观、价格、技术、关键价位和配置；缺口必须显式进入 missing evidence。
- 如果宏观风险高、价格 stale、关键指标缺失或缺少关键价位确认，不能升级为强行动信号。

Handoff：

- Main Agent 负责实施和集成。
- Reviewer Agent 在 diff 完成后做 read-only review gate，重点审 phase 边界、推荐数量、normalized data 依赖、数据缺失降级和测试覆盖。
- QA Agent 或 Main Agent 做本地 Dashboard smoke；production QA 可在合并部署后按需补充。

## 1. 技术摸底结果

当前基础能力：

- Dashboard repository 已读取 active `holdings`、`watchlist_items`、`key_price_levels`、`market_data_daily`、`macro_observations` 和最近 ingestion run。
- Dashboard service 已把 holding 和 watchlist 合并为 target snapshots，并区分 `holding`、`watchlist`、`both` role。
- Phase 3 action 已支持 `confidence`、`dataQuality`、`dataSources`、四组 evidence 和 `ruleVersion`。
- `watchlistItems` 当前主要展示状态，不负责突出高质量机会。

主要缺口：

- 没有独立的 opportunity candidate/action 契约。
- 多个关注标的同时触发时没有排序、去重和每日上限。
- 没有明确硬排除规则，容易把弱信号包装成机会。
- UI 没有“今日最值得看的机会”位置，也没有稳定的无机会状态。

## 2. 本阶段目标

Phase 4 完成后，Dashboard 应能回答：

- 今天关注列表里是否有一个值得重点看的机会？
- 为什么它值得看，哪些证据支持，哪些证据反对？
- 数据是否完整、新鲜，缺了什么？
- 为什么其他关注标的没有被推荐？

产品原则：

- 每日最多 1 个机会。
- 没有机会时明确保持安静。
- 机会成立必须有规则化证据，不靠黑盒解释。
- 数据缺失、宏观风险高或信号不一致时降级为观察或不展示为机会。

## 3. In Scope

### 3.1 机会扫描契约

新增或扩展 Dashboard 类型，建议包含：

- `opportunityScore`：内部排序分数，仅用于排序和测试，可不直接展示。
- `opportunityRank`：进入展示池后的排序。
- `opportunityAction`：复用 `DashboardTrustActionRecommendation` 或定义兼容子类型。
- `opportunityReasons`：可由 evidence supporting 汇总生成，避免双维护。
- `disqualifiedReasons`：硬排除或未入选原因，用于测试和后续 UI。

兼容要求：

- 现有 holding action 不因 Phase 4 破坏。
- UI 继续优先展示 Phase 3 evidence 分组。
- Dashboard 继续只消费 normalized internal data 和配置表。

### 3.2 机会成立条件

候选机会可由以下信号组合产生：

- 价格接近用户配置的 support / buy zone 关键价位。
- 近 N 日显著回撤但未触发结构性破位。
- 短均线/近期低点出现初步企稳迹象。
- 成交量未显示异常失控，或缺失时降级。
- 宏观反弹机会评分处于 watch / active。
- 标的在 watchlist 中优先级较高。

候选信号必须进入 supporting / opposing / risks / missing evidence。

### 3.3 硬排除与降级

以下情况不得输出强机会：

- `dataQuality=unavailable`。
- 价格或宏观 stale。
- 缺少最低价格数据。
- 宏观风险评分处于高风险且反弹机会不 active。
- 距离关键价位太远，且没有其他强支持证据。
- 只有单一弱信号，且 missing evidence 明显。

处理方式：

- 降级为 observe / wait。
- 或不进入今日机会，仅在关注列表中显示普通状态。
- missing evidence 必须明确说明缺失数据。

### 3.4 每日 0-1 个机会

规则：

- 持仓和关注列表合并扫描，但展示机会最多 1 个。
- `both` role 优先保留持仓上下文，不重复展示两张卡。
- 如果最高候选低于阈值，Dashboard 显示无高质量机会。
- 不展示“次优列表”，避免鼓励低质量交易。

排序建议：

- 数据质量优先。
- 接近关键价位优先。
- 反弹机会评分支持优先。
- watchlist priority 作为 tie-breaker，而不是单独决定机会。

### 3.5 Dashboard UI

新增或调整区域：

- 顶部 summary 附近展示“今日机会”或“今日无高质量机会”。
- 有机会时展示 symbol、action、confidence、dataQuality、关键价格/价位距离、支持/反对/风险/缺口。
- 无机会时保持简短，不展示空列表。

移动端要求：

- 360px、390px、414px 下不横向溢出。
- 机会卡片不遮挡现有持仓可信层。
- 长 symbol 和长证据文本必须换行。

## 4. Out Of Scope

Phase 4 不做：

- 不做 AI summaries 或 AI 解释层。
- 不做新闻/财报深度理解。
- 不做自动定时任务或 Vercel Cron。
- 不做券商同步。
- 不做主动推送。
- 不做分钟级/秒级行情。
- 不做全市场推荐或大量扩展机会。
- 不实现真实下单。
- 不做完整复盘页面。
- 不做自动学习、自我迭代或未经用户确认的规则修改。
- 不让 Dashboard UI 依赖 provider raw payload。

## 5. 推荐实施顺序

### 5.1 契约与测试先行

- 更新 Dashboard 类型，加入 opportunity summary/candidate。
- 扩展 service fixtures：无机会、一个机会、多个候选、stale、partial、宏观高风险、无关键价位。

验收：

- service tests 能证明每日最多 1 个机会。
- 数据不足时不输出强机会。

### 5.2 Service 规则实现

- 在现有 target snapshot 基础上生成 candidate。
- 复用 key level proximity、macro scoring、data quality 和 evidence helpers。
- 按阈值过滤和排序。

验收：

- watchlist/both target 可以进入候选。
- holding action 不回退。
- 无机会状态明确。

### 5.3 UI 集成

- 增加机会/无机会区域。
- 复用 confidence/dataQuality/evidence UI。
- 保持现有持仓和关注列表信息。

验收：

- 正常、无机会、partial/stale 状态都可读。
- 移动端无横向溢出。

### 5.4 文档、review 与 QA

- 若实现改变 active state，更新 `docs/context-map.md` 和 `AGENTS.md`。
- Reviewer gate 检查推荐数量、phase 边界、数据缺失降级和测试覆盖。
- 本地 smoke 后再进入 PR。

## 6. 验收标准

- Dashboard 每天最多展示 1 个规则化机会。
- 无高质量机会时明确显示观察/不操作，不展示次优列表。
- 机会 action 有 confidence、dataQuality、dataSources、supporting/opposing/risks/missing evidence。
- partial/stale/unavailable 数据不能产生强机会。
- Dashboard UI 不读取或展示 provider raw payload。
- 相关 service/UI tests 通过。
- 合并前 `pnpm check` 通过，或若因环境限制跳过，必须记录原因。

## 7. Validation Plan

定向测试：

```bash
pnpm test src/server/dashboard/service.test.ts src/server/dashboard/indicators.test.ts src/server/dashboard/macro-scoring.test.ts src/components/dashboard/dashboard-view.test.ts
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

- `/dashboard` 无机会：明确显示无高质量机会。
- `/dashboard` 1 个机会：展示 symbol、置信度、数据可信度和四组证据。
- 多个候选：只展示最高质量机会。
- stale/partial：机会降级或不展示强行动信号。
- 360px、390px、414px：机会卡片和持仓卡片可读，无横向溢出。

## 8. 风险与约束

- 推荐过度：必须保持每日最多 1 个机会。
- 证据不足：缺基本面/新闻时不能假装完整，应进入 missing/risk。
- 数据一致性：价格日期、宏观日期和 ingestion 时间仍需分别表达。
- 用户体验：机会区必须服务快速判断，不应把 Dashboard 变成候选列表。

## 9. 完成定义

- Phase 4 功能实现完成并通过相关测试。
- `pnpm check` 通过。
- 本地 Dashboard smoke 完成并记录结果。
- Diff 经 review gate 通过，无 blocking issue。
- PR checks 全部通过后合并。
- 合并后依赖 Vercel 自动部署；production QA 可按需补充。

## 10. 当前下一步

1. Main Agent 按本计划进入 Phase 4 契约与测试实现。
2. 实现时坚持单 writer。
3. 若中途发现需要 schema 或快照表扩展，先更新本计划并重新过 review gate。
