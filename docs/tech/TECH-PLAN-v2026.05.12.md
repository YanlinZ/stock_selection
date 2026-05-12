# stock_selection 技术开发计划

版本：v2026.05.12

本文件是对 `docs/tech/TECH-PLAN-v2026.05.11.md` 的状态更新和 Phase 2 开发入口说明。

除本文件明确新增或调整的内容外，`docs/tech/TECH-PLAN-v2026.05.11.md` 继续作为 Phase 1 实施细节记录有效。

## 相对上一版的关键变化

- 记录 Phase 1 配置页与数据入库已完成并合入 `main`。
- 记录 Production 已配置 FMP、CoinGecko、FRED API key，并已 redeploy。
- 将当前阶段推进到 Phase 2：Dashboard v1 准备阶段。
- 明确 Phase 2 应消费 normalized data，不直接读 provider raw response。
- 明确 Phase 2 仍不接 AI 摘要、新闻/财报深度理解或自动定时任务。
- 明确项目统一采用 AI coding agent 语境下的 Harness Engineering 定义，详见 `docs/engineering/HARNESS-ENGINEERING.md`。

## 1. 当前阶段

当前项目处于：

> Phase 2：Dashboard v1 准备阶段

Phase 0 已完成并部署到 Vercel Production。

Phase 1 已完成：

- 数据库 schema v1 与 migration。
- 配置页 v1：持仓、关注列表、个人关键价位。
- FMP、CoinGecko、FRED provider contract、normalizer、fake provider 和离线 fixture tests。
- ingestion harness：raw response 保存、normalized data upsert、ingestion run 状态、重复刷新幂等控制。
- 真实 provider 读取路径：FMP、CoinGecko、FRED。
- 配置页数据状态 UI：最近刷新时间、provider 状态、stale/error 状态、错误信息可见且不泄露 secret。

Harness Engineering 定义状态：

- 2026-05-12 已确认项目中的 harness 目标与 AI 开发最佳实践中的 Harness Engineering 一致。
- 项目内统一定义见 `docs/engineering/HARNESS-ENGINEERING.md`。
- Phase 1 的 provider/ingestion harness 是完整 Harness Engineering 思路在数据管线阶段的具体实现，不应被理解为 harness 的全部含义。

Phase 1 生产验收状态：

- 2026-05-12 UTC 已运行 `pnpm check`：typecheck、lint、7 个测试文件、25 个测试通过。
- 2026-05-12 UTC 已配置 Vercel Production：`FMP_API_KEY`、`COINGECKO_API_KEY`、`FRED_API_KEY`。
- 2026-05-12 UTC 已 redeploy Production，正式域名仍为 `https://stock-selection-pi.vercel.app`。
- 线上 `/api/health` 为 `status: ok`，数据库连接正常，三个 provider key 均为 `true`。
- 线上 `/settings` 已手动刷新：批次结果为 `3/3 成功，0 失败，89 行入库`。
- 当时 Production 配置中没有 active crypto 标的，因此 CoinGecko key 已配置但刷新计划未触发 CoinGecko；本地已用同一 key 验证 CoinGecko 官方 API 可返回 BTC 数据。

## 2. Phase 2 目标

Phase 2 目标是实现 Dashboard v1，让用户能在一个页面看到日级、可解释、克制的交易辅助判断。

Phase 2 应实现：

- 今日一句话总判断。
- 宏观市场状态。
- 持仓状态。
- 技术位与行动建议。
- 8/21/50/200 日均线。
- 前高、前低、成交量变化。
- 个人关键价位接近判断。
- 宏观双评分：市场风险评分与反弹机会评分。
- 恐慌反弹模式基础判断。

Phase 2 完成后，系统可以基于收盘级 normalized data 输出一版可解释 Dashboard，但仍不要求新闻、财报或 AI 深度理解。

## 3. Phase 2 边界

Phase 2 不做：

- 不接 AI 摘要或 AI 解释。
- 不做新闻/财报深度理解。
- 不做自动定时任务。
- 不做券商同步。
- 不做主动推送。
- 不做分钟级/秒级行情。
- 不做全市场大量机会推荐。
- 不实现真实下单。
- 不实现复盘与自我迭代机制。

Phase 2 可以有行动建议枚举，但必须是规则主导、可解释、带依据日期的 Dashboard v1，不应提前扩展成完整交易分析系统。

## 4. Phase 2 推荐实施顺序

### 4.1 Dashboard Data Service

建立 Dashboard 读取层，只消费 Phase 1 normalized data：

- `market_data_daily`
- `macro_observations`
- `holdings`
- `watchlist_items`
- `key_price_levels`
- `ingestion_runs`

不要让 Dashboard 页面组件直接读取 provider raw response。

验收：

- 能读取 active 持仓和关注标的。
- 能读取最近市场数据和宏观数据。
- 数据不足时返回明确的 unavailable/stale 状态。

### 4.2 Technical Indicators

实现日级技术指标：

- 8/21/50/200 日均线。
- 近 N 日高低点。
- 成交量变化。
- 与关键价位的距离。

验收：

- 对数据不足的标的明确降级，不抛错。
- 指标计算有单元测试覆盖。

### 4.3 Macro Scoring

实现宏观双评分：

- 市场风险评分。
- 反弹机会评分。

优先参考：

- VIX。
- 10 年期美债收益率或 TLT。
- SPY/QQQ/科技风险资产数据可用性。
- BTC/ETH 风险偏好数据在配置存在时纳入。

验收：

- 数据缺失时输出“信息不足”而不是强行判断。
- `VIX > 25` 既能提高风险评分，也能提高反弹机会评分。

### 4.4 Dashboard UI

在现有受保护首页实现 Dashboard v1。

页面应包含：

- 顶部一句话总判断。
- 宏观状态卡片。
- 持仓状态。
- 关键价位接近提醒。
- 数据更新时间与 stale 提示。

验收：

- 没有高质量机会时明确显示“不操作/观察”，不强行推荐。
- 所有行动建议都包含原因、风险和依据日期。
- UI 不展示 provider raw payload，不泄露 secret。

## 5. 测试策略

Phase 2 至少覆盖：

- Dashboard data service 在无数据、stale 数据、正常数据下的返回。
- 技术指标计算。
- 关键价位接近判断。
- 宏观双评分基础规则。
- 首页在数据不足时不崩溃。

继续要求：

- `pnpm check` 通过。
- `/api/health` 保持 `status: ok`。
- 没有任何 API key、token、真实 secret 进入 Git。

## 6. 运维备注

- Vercel Production 必须配置 `DATABASE_URL`、`AUTH_SECRET`、`APP_ACCESS_PASSWORD`、`FMP_API_KEY`、`COINGECKO_API_KEY`、`FRED_API_KEY`。
- 修改 Vercel 环境变量后需要 redeploy。
- `OPENAI_API_KEY` 当前不是 Phase 1 或 Phase 2 初期依赖，`/api/health` 中为 `false` 不代表当前阶段失败。
- 如果某个 provider 显示 `未运行`，先确认配置中是否存在会触发该 provider 的 active 标的。
