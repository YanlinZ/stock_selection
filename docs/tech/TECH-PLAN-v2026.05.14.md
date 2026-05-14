# stock_selection 技术开发状态

版本：v2026.05.14

本文件记录 Phase 2 Dashboard v1 完成后的当前工程状态。`docs/tech/TECH-PLAN-v2026.05.12.md` 继续作为 Phase 2 原始实施计划与验收口径记录有效。

## 相对上一版的关键变化

- Phase 2 Dashboard v1 已完成并合入 `main`。
- 受保护首页 `/` 与 `/dashboard` 已展示 Dashboard v1，而不是准备页或占位页。
- Dashboard 读取层只消费 normalized data 和配置表，不读取 provider raw response。
- 已实现日级技术指标、关键价位接近判断、宏观双评分和恐慌反弹基础判断。
- 已补充 Dashboard service、technical indicators、macro scoring 和 UI 的测试覆盖。
- 当前阶段仍不接 AI 摘要、新闻/财报深度理解、自动定时任务、券商同步、主动推送、高频行情、全市场推荐或真实下单。

## 1. 当前状态

当前项目处于：

> Phase 2：Dashboard v1 已完成，进入 post-merge QA 与后续范围决策阶段

Phase 2 合并记录：

- PR：`https://github.com/yanlin-zhou/stock-selection/pull/24`
- Merge commit：`f007a25d2d6bc991e7f24fc7d499811d5bcad36b`
- 合并时间：2026-05-13 UTC

已完成能力：

- Dashboard data service：读取 `market_data_daily`、`macro_observations`、`holdings`、`watchlist_items`、`key_price_levels`、`ingestion_runs`。
- 数据状态：支持 normal、stale、unavailable 降级，不因数据不足崩溃。
- 技术指标：8/21/50/200 日均线、近 N 日高低点、成交量变化、关键价位距离。
- 宏观双评分：市场风险评分、反弹机会评分。
- 恐慌反弹模式：基于 VIX 与大盘回撤的 active/watch/off 基础判断。
- Dashboard UI：顶部一句话总判断、宏观状态、恐慌反弹状态、关键价位提醒、持仓状态、关注列表、数据更新时间。
- 行动建议：规则主导，包含原因、风险和依据日期；无高质量机会时明确显示“不操作/观察”。

## 2. 已验证结果

本地验证：

- 2026-05-13 UTC 已运行 `pnpm check`：typecheck、lint、16 个测试文件、46 个测试通过。
- 2026-05-13 UTC 已运行 `pnpm build`：Next production build 通过。
- 本地浏览器 smoke：`http://localhost:3000/dashboard` 可正常渲染 Dashboard v1。

合并与部署：

- PR #24 合并前 GitHub/Vercel checks 均通过。
- 合并后两个 Vercel checks 均为 success：
  - `stock-selection`
  - `stock-selection-w5bi`
- Production root smoke 已确认生产站点可打开并显示登录页。

限制说明：

- 合并后开发环境内直接 `curl https://stock-selection-pi.vercel.app/api/health` 因本地网络权限/DNS 限制未能复测。
- 后续正式 QA 仍应在可登录生产环境中覆盖 `/`、`/dashboard`、`/settings` 与 `/api/health`。

## 3. 当前边界

Dashboard v1 仍保持 MVP 克制：

- 不接 AI 摘要或 AI 解释。
- 不做新闻/财报深度理解。
- 不做自动定时任务。
- 不做券商同步。
- 不做主动推送。
- 不做分钟级/秒级行情。
- 不做全市场大量机会推荐。
- 不实现真实下单。
- 不实现复盘与自我迭代机制。

这些能力若进入后续 phase，需要先更新 PRD/技术计划和验收口径。

## 4. 后续建议

优先级建议：

- Post-merge targeted QA：生产登录后验证 `/` 与 `/dashboard` 的 Dashboard v1、数据状态、无数据/stale 状态、移动端布局。
- 关闭或重测当前 QA issue 中已由 Phase 2 覆盖的问题。
- 在进入下一阶段前明确 Phase 3 范围，避免自然滑入 AI、新闻、券商同步或推送。

可考虑的 Phase 2 follow-up：

- 增加更精细的 Dashboard fixture 或 repository-level tests。
- 增加生产 QA 记录文件，保存 post-merge targeted QA 结果。
- 根据真实数据观察结果微调评分阈值，但仍保持规则可解释。
