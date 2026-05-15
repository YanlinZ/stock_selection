# stock_selection

个人美股/加密交易决策 Dashboard。当前 Phase 4 Watchlist Opportunity Scan 已完成、合入 `main` 并部署到 Production。

## 当前状态

- Phase 0 工程底座已完成：Next.js App Router、TypeScript、Tailwind、Drizzle、Neon Postgres、Vercel、简单密码保护和健康检查。
- Phase 1 配置页与数据入库已完成：持仓、关注列表、关键价位、provider contract、真实 provider、raw response、normalized data、ingestion run 状态和数据刷新 UI。
- Phase 2 Dashboard v1 已完成：受保护首页和 `/dashboard` 基于 normalized data 展示今日总判断、宏观状态、持仓/关注状态、技术指标、关键价位提醒和 stale/unavailable 数据状态。
- Phase 2.1 本地与生产 hardening 已完成：Settings/auth、移动端导航、表单约束和生产 QA 问题 QA-001 至 QA-007 均已关闭。
- Phase 3 Dashboard Trust 已完成：持仓判断展示 confidence、dataQuality、dataSources、supporting/opposing/risks/missing evidence 和轻量 daily decision snapshots。
- Phase 4 Watchlist Opportunity Scan 已完成：Dashboard 在持仓/关注列表范围内每天最多展示 0-1 个规则化高质量机会；没有机会时明确保持观察/不操作，并展示可信证据、数据质量和缺口。
- Production 地址：`https://stock-selection-pi.vercel.app`

当前 Dashboard 是规则主导的日级辅助判断；仍不接券商账户，不做自动下单，不做主动推送，不接 AI 摘要，不做新闻/财报深度理解，不做全市场推荐。

## 本地启动

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

`.env.local` 至少需要配置：

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="replace-with-random-secret"
APP_ACCESS_PASSWORD="replace-with-local-password"
FMP_API_KEY=""
COINGECKO_API_KEY=""
FRED_API_KEY=""
```

`OPENAI_API_KEY` 预留给后续 AI 解释阶段，当前 Dashboard 不依赖。

## 常用命令

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm check
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## 数据库环境约定

- 本地开发连接云端 `stock_selection_dev` 数据库。
- Vercel 线上环境连接云端 `stock_selection_prod` 数据库。
- schema 变更先改 `src/db/schema.ts`，再运行 `pnpm db:generate` 生成 migration。
- Phase 1 数据刷新会写入 `provider_raw_responses`、`market_data_daily`、`macro_observations` 和 `ingestion_runs`。
- Dashboard 只读取 normalized data 与配置表，不读取 provider raw payload。
- Phase 3 写入 `dashboard_decision_snapshots` 作为轻量 replay context；Phase 4 默认不新增 schema。

## 文档目录

- `docs/context-map.md`：Codex 文档路由器，开发、QA、review 前先读它来选择最小必要上下文。
- `docs/prd/`：产品需求文档和增量 PRD。
- `docs/tech/`：技术开发计划。
- `docs/process/`：协作流程、review agent 协议。
- `docs/review/`：code review checklist。
- `docs/engineering/`：工程方法论定义，例如 Harness Engineering。
- `docs/README.md`：文档索引和维护约定。

## 部署

1. 推送到 GitHub。
2. 在 Vercel 导入仓库。
3. 连接 Neon Postgres。
4. 在 Vercel Environment Variables 配置 `.env.example` 中的变量。
5. 部署后打开 `/api/health` 或受保护的 `/health` 验证环境与数据库。
6. 修改 Vercel 环境变量后需要 redeploy。
