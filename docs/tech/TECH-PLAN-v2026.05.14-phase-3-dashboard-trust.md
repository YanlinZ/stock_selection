# stock_selection 技术开发计划

版本：v2026.05.14-phase-3-dashboard-trust

本文件基于 Phase 2 Dashboard v1 完成态、Phase 2.1 production targeted QA 结果、当前代码技术摸底和用户对 Phase 3 的产品取舍，规划下一阶段开发。

`docs/tech/TECH-PLAN-v2026.05.14.md` 继续作为 Phase 2 Dashboard v1 完成状态记录有效；`docs/tech/TECH-PLAN-v2026.05.14-phase-2.1-hardening.md` 继续作为 Phase 2.1 hardening 记录有效。本文件是 Phase 3 执行入口。

## 相对上一版的关键变化

- 将下一阶段定义为 Phase 3：Dashboard Trust for Holdings Decisions / 持仓判断可信层。
- Phase 3 的核心不是增加推荐数量，而是让持仓操作建议更可信、可解释、可追溯。
- QA-001、QA-002、QA-005 暂不作为 Phase 3 前置阻塞；它们仍保留为后续 production 长期使用时的复测项。
- 持仓建议从 `reasons` / `risks` 两组扩展为支持、反对、风险、缺口四组证据。
- 增加判断置信度与数据可信度标签，解决“数据来源/更新时间不清楚”和“系统判断与直觉不一致时缺少依据”的信任问题。
- 开始保存轻量每日判断快照，为未来复盘与自我迭代机制打基础，但本阶段不实现完整复盘系统。
- 继续保持 Dashboard plus simple settings 边界，不进入 AI summaries、broker sync、real trading、push notifications、high-frequency data 或 full-market recommendations。

## 0. Planner Gate

Goal：

- 让用户打开 Dashboard 时，对持仓操作建议更有信心。
- 用户应能看到每条建议用了哪些数据、数据来自哪里、何时更新、哪些证据支持或反对、哪些风险和缺口会影响判断。
- 数据不足时仍给出谨慎建议，但必须明确风险和缺口，不能让弱数据看起来像强结论。

Scope：

- 包含持仓操作建议可信层、证据分组、数据来源与更新时间、置信度/数据可信度标签、轻量每日判断快照、相关测试和本地 smoke。
- 优先强化 holdings，不先扩展关注列表机会发现或全市场机会。
- Dashboard 继续只消费 normalized internal data 和配置表，不让 UI 依赖 provider raw payload。
- 明确不包含 AI summaries / AI 解释、新闻/财报深度理解、券商同步、真实交易、推送、分钟级/秒级行情、全市场推荐、完整复盘系统、自我迭代或自动规则修改。

Plan：

1. 固化 Phase 3 数据契约和证据模型。
2. 扩展 Dashboard service 的持仓建议可信层。
3. 增加轻量每日判断快照 schema 与幂等写入。
4. 在 Dashboard 持仓区域集成可信标签、来源时间和证据分组。
5. 补齐 targeted tests、文档和本地 smoke。
6. 通过 review gate 与 PR checks 后合并。

Validation：

- 迭代中跑 Dashboard service、macro scoring、indicators 和 Dashboard UI 的定向测试。
- 若实现包含 schema 变更，生成并检查 Drizzle migration；有数据库环境时运行 `pnpm db:migrate`。
- 合并前跑 `pnpm check`。
- 本地 smoke 覆盖 `/dashboard` 正常、stale、部分缺失、无数据和窄屏持仓卡片。

Risks：

- 可信解释容易滑向 AI 或完整复盘系统，必须保持规则化、可解释、可审计。
- 价格日期、指标日期、宏观日期、provider fetched time 和 ingestion run time 可能不同步，不能只展示一个模糊更新时间。
- 信息量增加后持仓卡片可能变得难扫读，需要默认可扫读、细节可展开。
- 快照写入需要注意幂等、生产数据膨胀、敏感信息最小化和 migration 风险。

Handoff：

- Main Agent 负责实施和集成。
- Reviewer Agent 在 diff 完成后做 read-only review gate，重点审 phase 边界、normalized data 依赖、schema/migration、数据一致性和测试缺口。
- QA Agent 或 Main Agent 执行本地 Dashboard smoke；production QA 可在合并部署后按需补充，不阻塞 Phase 3 开发启动。

## 1. 技术摸底结果

### 1.1 当前 Dashboard 数据流

当前 Dashboard 读取层位于：

- `src/server/dashboard/repository.ts`
- `src/server/dashboard/service.ts`
- `src/server/dashboard/types.ts`
- `src/components/dashboard/dashboard-view.tsx`

已具备的基础能力：

- Repository 读取 active `holdings`、`watchlist_items`、`key_price_levels`、`market_data_daily`、`macro_observations` 和最近一次 manual `refresh_all` ingestion run。
- Dashboard service 生成 `DashboardSnapshot`，包含 `dataFreshness`、`macro`、`summary`、`holdings`、`watchlistItems` 和 `keyLevelAlerts`。
- `DashboardActionRecommendation` 已有 `kind`、`label`、`reasons`、`risks` 和 `basisDate`。
- `DashboardTargetSnapshot` 已有单标的 `dataStatus`、`latestPriceDate`、`movingAverages`、`recentRange`、`volumeChange` 和关键价位距离。
- `market_data_daily` 和 `macro_observations` 都保存 provider、date、rawResponseId、ingestionRunId、createdAt、updatedAt。
- ingestion 层保存 provider raw response，但 Dashboard 目前不读取 raw payload，符合 normalized data 边界。

主要缺口：

- 持仓建议只有 `reasons` / `risks`，缺少反对证据和数据缺口。
- `basisDate` 不能表达价格、技术指标、宏观和 ingestion 的多个不同更新时间。
- 单标的建议没有独立的数据可信度、判断置信度或来源详情。
- UI 只展示市场数据日期、宏观数据日期和最近刷新，不足以解释某个持仓判断为什么可信或为什么和用户直觉不同。
- 当前 schema 没有每日判断快照表，也没有 rule version 概念。
- Dashboard service 是纯计算入口，尚无持久化快照的 repository contract。

### 1.2 当前测试覆盖

已有相关测试：

- `src/server/dashboard/service.test.ts` 覆盖无数据、stale、正常宏观/关键价位/指标路径。
- `src/server/dashboard/indicators.test.ts` 覆盖技术指标。
- `src/server/dashboard/macro-scoring.test.ts` 覆盖宏观评分。
- `src/components/dashboard/dashboard-view.test.ts` 覆盖 unavailable snapshot 渲染不抛错。

Phase 3 需要新增或扩展：

- 持仓 evidence 分组与默认降级逻辑。
- confidence / data quality 标签计算。
- 单标的数据来源与更新时间 metadata。
- stale、部分缺失、无宏观、无技术指标、无成交量等缺口表达。
- 快照写入的幂等性和敏感信息最小化。
- Dashboard UI 对四组证据和标签的渲染。

## 2. 本阶段目标

Phase 3 完成后，持仓区域应从“显示操作建议”升级为“显示可信判断”：

- 用户能看到每个持仓建议的数据依据和数据状态。
- 用户能区分结论强弱：依据较强、谨慎观察、数据部分缺失、数据过期等。
- 用户能看到支持因素、反对因素、风险和缺口，而不是只看到单向理由。
- 当数据和用户直觉不一致时，Dashboard 能展示导致差异的规则化证据。
- 每日关键判断被轻量保存，后续可以用于复盘，但本阶段不做复盘 UI 或自动学习。

## 3. In Scope

### 3.1 持仓建议可信契约

扩展 Dashboard 类型契约，优先作用于 holdings：

- `confidence`：建议置信度，例如 `high`、`medium`、`low`。
- `dataQuality`：数据可信度，例如 `complete`、`partial`、`stale`、`unavailable`。
- `evidence`：按 `supporting`、`opposing`、`risks`、`missing` 分组。
- `dataSources`：规则判断使用到的 normalized 数据来源与更新时间。
- `ruleVersion`：当前规则版本，建议从常量开始，例如 `dashboard-rules-v3.0.0`。

证据项建议包含：

- `label`：用户可读结论。
- `detail`：可选的数值或解释。
- `source`：`market_data_daily`、`macro_observations`、`key_price_levels`、`holdings`、`ingestion_runs` 等安全来源名。
- `basisDate`：该证据依据的数据日期。
- `impact`：`positive`、`negative`、`neutral` 或 `missing`。

兼容要求：

- 现有 `reasons` / `risks` 可作为 summary 兼容字段保留，避免一次性重写所有调用方。
- 新 UI 应优先使用 evidence 分组；老字段继续用于顶部总判断、宏观模块或过渡期显示。

### 3.2 数据来源与更新时间模型

为每个持仓 target 生成可展示的数据来源：

- 价格来源：provider、latest market date、latest price、是否 stale。
- 技术指标来源：使用的 market data 日期范围、各指标是否 ready/unavailable。
- 宏观来源：VIX、DGS10、SPY/QQQ/BTC/ETH 等已参与判断的数据日期。
- 配置来源：持仓、关键价位和用户配置来源于 Settings active records。
- ingestion 来源：最近 batch run 的 startedAt、status、summary 中的安全摘要。

注意：

- UI 不展示 raw response payload、request params、secret、API key 或完整内部错误。
- 不把所有数据压缩成一个“最近更新”；价格、宏观和 ingestion 时间需要分别表达。
- 对 provider 名称可以展示为安全标签，例如 FMP、CoinGecko、FRED。

### 3.3 判断置信度与数据可信度

规则应保守、可解释：

- `dataQuality=complete`：价格数据新鲜，关键指标 ready，宏观基础数据可用。
- `dataQuality=partial`：价格可用但部分指标、成交量、宏观或关键价位缺失。
- `dataQuality=stale`：价格或宏观数据超过 stale 阈值。
- `dataQuality=unavailable`：缺少生成持仓判断所需的最低价格数据。

`confidence` 建议由触发强度和数据质量共同决定：

- 强触发 + 数据完整：`high`。
- 有触发但数据部分缺失，或宏观风险显著：`medium`。
- 数据 stale、关键输入缺失、只有单一弱信号：`low`。

数据不足时仍输出建议，但建议必须更谨慎：

- 不能把缺失数据下的判断升级为强行动信号。
- `refresh_data`、`wait`、`observe` 可以作为低置信度建议。
- 所有低置信度建议必须带 `missing` 和 `risks`。

### 3.4 轻量每日判断快照

新增轻量快照能力，为未来复盘打基础。

推荐 schema：

- 表名：`dashboard_decision_snapshots`
- 字段：
  - `id`
  - `snapshotDate`
  - `scope`：`summary` 或 `holding`
  - `instrumentId`：summary 可为空，holding 必填
  - `symbol`
  - `actionKind`
  - `actionLabel`
  - `confidence`
  - `dataQuality`
  - `basisDate`
  - `dataSources` JSONB
  - `evidence` JSONB
  - `keyLevels` JSONB
  - `macroState` JSONB
  - `ruleVersion`
  - `generatedAt`
  - `createdAt`
  - `updatedAt`

约束建议：

- 唯一键：`snapshotDate` + `scope` + `instrumentId` + `ruleVersion`。
- Dashboard 多次刷新同一天同规则版本应 upsert，不制造重复快照。
- 快照只保存复盘所需上下文，不保存 raw provider payload、secret、cookie、完整账户资料或长错误日志。
- 第一阶段只保存 summary 和 holdings；watchlist 快照可后续评估。

服务边界：

- `createDashboardSnapshot` 继续保持纯函数，方便测试。
- `createDashboardService().getDashboardSnapshot()` 可在 repository 层完成可选持久化，例如 `persistDailyDecisionSnapshots(snapshot)`。
- 快照写入失败不应让 Dashboard 主渲染崩溃；应安全降级并可在测试中覆盖。

### 3.5 Dashboard UI 集成

持仓卡片应增加：

- 置信度 badge。
- 数据可信度 badge。
- 价格、宏观、ingestion 的来源与更新时间。
- 支持 / 反对 / 风险 / 缺口四组证据。
- 数据缺失或过期时的清晰提示。

交互与布局要求：

- 默认保持可扫读，避免把持仓卡片变成长报告。
- 详细证据可以采用分组区块或可展开区域。
- 移动端 360px、390px、414px 下不能横向溢出，长 symbol、长原因文本必须换行。
- 保留现有技术指标、近高/近低、成交量和关键价位信息。

### 3.6 Simple Settings 最小补充

本阶段默认不扩展复杂策略配置。

只有在实现中确实需要时，才允许添加简单设置：

- 是否默认展开详细依据。
- 风险偏好或观察周期的展示文案。

任何设置补充都必须直接服务 Dashboard trust，不得扩展为交易执行、复杂规则编辑器或自动调参。

## 4. Out Of Scope

Phase 3 不做：

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
- 不以关闭 QA-001、QA-002、QA-005 作为本阶段前置条件。

## 5. 推荐实施顺序

### 5.1 契约与测试先行

先更新 Dashboard 类型和纯函数测试：

- 定义 evidence、confidence、dataQuality、dataSources、ruleVersion 类型。
- 扩展 service fixtures 覆盖完整数据、部分缺失、stale、无价格、宏观缺失、关键价位接近。
- 保证现有 summary、macro、watchlist 过渡期不破坏。

验收：

- service tests 能证明持仓建议返回四组证据和可信标签。
- 数据不足时仍有建议，但风险和缺口明确。

### 5.2 Repository 数据来源补齐

在 Dashboard repository 中补齐安全来源元数据：

- 单标的 market data provider、date、updatedAt、ingestionRunId。
- macro observations 的 provider、date、updatedAt、seriesId。
- latest batch run 的 status、startedAt、summary 安全摘要。

验收：

- Dashboard service 不读取 provider raw payload。
- UI 需要的来源和时间都来自 normalized rows、config rows 或 ingestion run。

### 5.3 快照 schema 与持久化

新增 Drizzle schema 和 migration：

- `dashboard_decision_snapshots` 表。
- upsert repository 方法。
- service 层可选持久化入口。

验收：

- 同一天同 rule version 重复生成 Dashboard 不产生重复记录。
- 快照写入失败时 Dashboard 仍可展示。
- JSONB 字段内容不包含 raw payload、secret 或长日志。

### 5.4 持仓判断可信层实现

在现有 `createTargetAction` 附近收敛规则：

- 将现有 reasons/risks 映射到 supporting/risks。
- 增加 opposing，例如趋势弱、宏观风险高、缺少止跌确认、价格偏离关键价位。
- 增加 missing，例如成交量缺失、MA200 不可用、宏观数据缺失、价格 stale。
- 根据数据质量和触发强度计算 confidence。

验收：

- 持仓建议可以解释为什么是小仓观察、关键价位观察、风控、等待或刷新。
- 当系统判断和用户直觉不同，证据里能看到导致差异的主要输入。

### 5.5 Dashboard UI 集成

更新持仓卡片：

- 展示 confidence / dataQuality。
- 展示来源与更新时间。
- 展示四组证据。
- 保留现有指标和关键价位。

验收：

- 正常数据、部分缺失、stale、无数据状态都可读。
- 移动端不遮挡、不溢出。
- 页面仍然是 Dashboard，不变成长篇报告。

### 5.6 文档、review 与 QA

更新必要文档：

- 若实现改变 phase 状态，更新 `docs/context-map.md` 和相关 QA smoke 入口。
- 若新增快照表，记录字段目的和敏感信息边界。

Review：

- Reviewer gate 重点检查 phase 边界、schema/migration、normalized data 依赖、数据日期表达和测试覆盖。

QA：

- 本地 Dashboard smoke 后再进入 PR merge。
- Production QA 可后置；QA-001、QA-002、QA-005 仍按当前状态保留。

## 6. 验收标准

Phase 3 完成需满足：

- 每个持仓建议都有 action、basisDate、confidence、dataQuality、supporting、opposing、risks、missing。
- 持仓卡片展示价格、宏观和 ingestion 的来源/更新时间，不只显示一个全局更新时间。
- 数据 partial/stale/unavailable 时仍能输出谨慎建议，并明确风险和缺口。
- Dashboard UI 不读取或展示 provider raw payload。
- 每日 summary 和 holding 判断快照可幂等保存。
- 快照保存最小必要上下文，不保存 secret、cookie、raw payload 或长错误日志。
- 相关 service/UI/schema tests 通过。
- 合并前 `pnpm check` 通过，或若因环境限制跳过，必须记录原因。

## 7. Validation Plan

定向测试：

```bash
pnpm test src/server/dashboard/service.test.ts src/server/dashboard/indicators.test.ts src/server/dashboard/macro-scoring.test.ts src/components/dashboard/dashboard-view.test.ts
```

如新增 snapshot repository tests，合并前一并运行对应测试文件。

Schema 相关：

```bash
pnpm db:generate
pnpm db:migrate
```

仅在实现包含 schema 变更且有可用 `DATABASE_URL` 时运行 migration；没有数据库环境时至少检查生成的 migration 和 `pnpm typecheck`。

合并前检查：

```bash
pnpm check
```

本地 smoke：

```bash
pnpm dev
```

浏览器检查：

- `/dashboard` 正常数据：持仓显示置信度、数据可信度、来源时间和四组证据。
- stale 数据：建议降级，风险和缺口清楚。
- 部分缺失：显示 `部分缺失` 或等价标签，不崩溃。
- 无数据：仍给出刷新/观察类建议，不输出强行动信号。
- 360px、390px、414px：持仓卡片可读，无横向溢出。

## 8. 风险与约束

- Phase 边界：不得把 evidence 分组包装成 AI 解释；所有判断仍是规则主导。
- 数据一致性：不同数据源日期可能不同，UI 必须分别表达。
- 快照膨胀：每日快照要按 scope 和 rule version 幂等 upsert，避免无限追加。
- 敏感信息：快照和 UI 不保存或展示 raw payload、secret、cookie、真实账户敏感字段或长日志。
- 用户体验：信息量增加后要保留扫读体验，必要时用分组或展开区域承载细节。
- 迁移风险：schema 变更必须经过 review，并明确生产迁移验证路径。

## 9. 完成定义

- Phase 3 功能实现完成并通过相关测试。
- `pnpm check` 通过。
- 本地 Dashboard smoke 完成并记录结果。
- Diff 经 review gate 通过，无 blocking issue。
- PR checks 全部通过后合并。
- 合并后依赖 Vercel 自动部署；production QA 可按需补充，不以 QA-001、QA-002、QA-005 关闭为本阶段前置条件。

## 10. 当前下一步

1. Main Agent 按本计划进入 Phase 3 实现前的任务拆分。
2. 如用户希望继续保持计划先行，可先开 Phase 3 implementation PR checklist。
3. 实现时坚持单 writer；如果需要并行，只能拆到独立 worktree 或互不重叠文件范围。
