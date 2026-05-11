# stock_selection

个人美股/加密交易决策 Dashboard。当前处于 Phase 0：可部署优先的技术地基阶段。

## Phase 0 范围

- Next.js App Router + TypeScript + Tailwind CSS
- 简单密码保护
- Drizzle ORM + Neon Postgres migration 流程
- 健康检查页面与 `/api/health`
- 基础检查：typecheck、lint、unit test

本阶段不接真实行情，不输出交易建议，不接券商账户。

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
```

`FMP_API_KEY`、`COINGECKO_API_KEY`、`FRED_API_KEY`、`OPENAI_API_KEY` 预留给后续阶段。

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

## 部署

1. 推送到 GitHub。
2. 在 Vercel 导入仓库。
3. 连接 Neon Postgres。
4. 在 Vercel Environment Variables 配置 `.env.example` 中的变量。
5. 部署后打开 `/api/health` 或受保护的 `/health` 验证环境与数据库。
