# stock_selection

个人美股/加密交易决策 Dashboard。当前 Phase 1 已完成，项目进入 Phase 2 Dashboard v1 准备阶段。

## 当前状态

- Phase 0 工程底座已完成：Next.js App Router、TypeScript、Tailwind、Drizzle、Neon Postgres、Vercel、简单密码保护和健康检查。
- Phase 1 配置页与数据入库已完成：持仓、关注列表、关键价位、provider contract、真实 provider、raw response、normalized data、ingestion run 状态和数据刷新 UI。
- Production 地址：`https://stock-selection-pi.vercel.app`
- Phase 2 下一步：基于 normalized data 实现 Dashboard v1 的宏观状态、持仓状态、技术位和行动建议。

当前仍不输出完整交易建议，不接券商账户，不做自动下单，不接 AI 摘要。

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

`OPENAI_API_KEY` 预留给后续 AI 解释阶段，Phase 1/Phase 2 初期不依赖。

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
