# stock_selection 技术开发计划

版本：v2026.05.10

## 1. 当前阶段

当前项目处于：

> Phase 0：可部署优先的技术地基阶段

Phase 0 的目标不是实现交易分析业务，而是先搭好一个后续容易迭代、可部署、可多设备开发、可迁移的工程底座。

第一版技术策略从“纯本地个人版”调整为：

- 本地开发 + 云端数据库
- Vercel 部署
- 手机和其他设备可访问
- 简单密码保护
- 数据源和分析逻辑保持可替换、可审计

## 2. 技术栈选择

### 2.1 Web 应用

- 前端与全栈框架：Next.js App Router
- UI 框架：React + TypeScript
- 样式：Tailwind CSS
- 组件：shadcn/ui
- 图标：lucide-react
- 图表：Recharts

选择原因：

- 适合快速构建 Dashboard 和配置页。
- 前后端可以先放在一个项目中，减少 MVP 阶段复杂度。
- 后续可部署到 Vercel，也可以迁移到 Node.js server 或 Docker。

### 2.2 后端与业务逻辑

- Next.js Route Handlers / Server Functions 作为轻量后端入口。
- 核心分析逻辑放在独立 domain/service 层。
- 数据获取、分析规则、AI 摘要、UI 展示必须分离。

后续不要把交易规则直接写在页面组件中。

### 2.3 数据库

推荐使用：

- Neon Postgres
- Drizzle ORM
- Drizzle Kit 管理 schema 和 migration

选择原因：

- 支持多台电脑开发共享同一套开发数据库。
- 支持 Vercel 部署后直接访问同一类云端数据库。
- 比纯本地 SQLite 更适合手机访问和后续部署。
- Postgres 后期扩展到历史报告、回测、任务状态、用户系统更自然。

### 2.4 数据源

MVP 阶段优先使用低成本真实数据：

- Financial Modeling Prep：美股、ETF、历史日线、财报日历、股票新闻。
- CoinGecko：BTC/ETH 与加密市场数据。
- FRED：利率、宏观经济序列。

所有数据源必须通过 adapter 封装，避免业务逻辑直接依赖某个供应商的返回结构。

### 2.5 AI 使用边界

MVP 采用：

> 规则主导，AI 解释。

AI 可以做：

- 中文摘要
- 新闻/财报解释
- 风险提示
- 一句话总判断润色
- 把结构化信号转成可读交易语言

AI 不应该做：

- 绕过规则直接给买卖建议
- 在没有结构化依据时推荐新标的
- 隐藏数据不足或不确定性

## 3. 本地配置依赖

本地开发电脑需要准备：

- Node.js LTS
- pnpm
- Git
- GitHub 仓库
- Vercel 账号
- Neon 账号或 Vercel Marketplace 中的 Neon Postgres

建议环境变量：

```env
DATABASE_URL="postgresql://..."
FMP_API_KEY="..."
COINGECKO_API_KEY="..."
FRED_API_KEY="..."
OPENAI_API_KEY="..."
AUTH_SECRET="..."
APP_ACCESS_PASSWORD="..."
```

注意：

- `.env.local` 不提交到 Git。
- 不要把 API key、token、账户凭证写入代码、测试 fixture 或文档示例的真实值中。
- 仓库中只保留 `.env.example`，并使用空值或占位符。

## 4. 多电脑开发策略

不推荐使用纯本地 SQLite 作为默认方案。

原因：

- 每台电脑会各有一份数据库文件。
- 配置、报告、历史分析结果不同步。
- 部署到 Vercel 后仍然需要另一套云端数据库。

推荐方式：

- 本地开发连接云端 `stock_selection_dev` 数据库。
- 线上部署连接云端 `stock_selection_prod` 数据库。
- 后续如果需要更严谨的多人协作或预览环境，再增加 preview database branch。

每台新电脑的理想启动流程：

```text
git clone repo
pnpm install
配置 .env.local
pnpm db:migrate
pnpm dev
```

## 5. 部署策略

最简单部署路径：

1. 将项目推到 GitHub。
2. 在 Vercel 导入 GitHub repo。
3. 在 Vercel Marketplace 创建或连接 Neon Postgres。
4. 在 Vercel Environment Variables 配置密钥。
5. Vercel 自动生成 `*.vercel.app` 地址。
6. 手机直接打开该地址访问。

Phase 0 访问控制：

- 使用简单密码保护整个 app。
- 暂不引入完整账号系统。

后续如需要多用户、权限、会话管理，再评估 Auth.js、Clerk、Supabase Auth 或自建登录系统。

## 6. Phase 0 范围

Phase 0 必须完成：

- 初始化 Next.js + TypeScript + Tailwind 工程。
- 接入 Drizzle + Neon Postgres。
- 建立 migration 流程。
- 定义 `.env.example`。
- 建立 `dev` / `prod` 数据库环境约定。
- 增加简单密码保护。
- 创建健康检查页或 API，用于验证部署、数据库、环境变量。
- 设置基础检查：typecheck、lint、unit test。
- 部署到 Vercel 并确认手机可访问。

Phase 0 不做：

- 不接真实行情。
- 不实现 Dashboard 交易建议。
- 不实现完整配置页。
- 不写复杂分析规则。
- 不做券商同步。
- 不做主动推送。

Phase 0 验收标准：

- 任意一台新电脑按 README 可以跑起来。
- Vercel 线上环境可以打开。
- 线上环境能连到 Neon Postgres。
- 页面有简单密码保护。
- 数据库 schema 通过 migration 管理。
- 密钥不进入仓库。
- 后续 Phase 1 可以直接开始做配置页和数据入库。

## 7. 后续开发节奏

### Phase 1：配置页与数据入库

目标：

- 实现持仓、关注列表、个人关键加仓价、基础偏好配置。
- 建立第一版数据库表。
- 接入 FMP、CoinGecko、FRED 的基础 adapter。
- 保存 raw response 和 normalized data。

边界：

- 用户可以维护配置，并看到数据是否成功更新。
- 暂不输出完整交易建议。

### Phase 2：Dashboard v1

目标：

- 实现今日总判断、宏观状态、持仓状态、技术位与行动建议。
- 实现 8/21/50/200 日均线、前高前低、成交量变化、关键价位接近判断。
- 实现宏观双评分和恐慌反弹模式。

边界：

- 收盘后可以生成一份可解释的日级 Dashboard。
- 不依赖新闻和财报深度理解。

### Phase 3：异常机会扫描与 AI 解释

目标：

- 实现关注列表异常下跌检测、硬排除、最多 1 个扩展机会。
- 接入新闻和财报日历。
- 加 AI 解释层。

边界：

- 系统开始真正服务“少而准”的机会发现。
- 没有高质量机会时明确保持安静。

### Phase 4：更新节奏与状态追踪

目标：

- 增加收盘后分析、开盘前轻量更新、手动刷新。
- Dashboard 展示计划状态：接近、触发、失效、仍有效。
- 保存每日历史报告。

边界：

- MVP 完整闭环。
- 满足 PRD 的两个页面范围和每日更新节奏。

### Phase 5：后续升级

候选方向：

- 标的详情页
- 历史判断回测
- 投资逻辑卡
- 主动提醒
- 交易复盘
- 更专业的数据源
- 完整登录系统
- 多用户或准 SaaS 架构

## 8. 核心工程原则

- 保持 MVP 克制，优先 Dashboard + 简单配置页。
- 规则和阈值尽量配置化，不散落硬编码。
- 买卖建议必须包含原因、风险和依据日期。
- 保存分析输入、规则版本、数据更新时间，方便追溯。
- 数据过旧或信息不足时，默认降级为“不操作”或“观察”。
- 扩展机会每天最多 1 个。
- 不实现真实下单功能。
- 不接券商账户，除非用户明确要求并重新定义安全边界。

## 9. 测试策略

Phase 0：

- typecheck
- lint
- 基础单元测试
- 健康检查 API 测试
- Vercel 部署冒烟测试

Phase 1 之后：

- 规则引擎测试
- provider 异常与限流测试
- 数据标准化 schema 测试
- Dashboard 有机会/无机会状态测试
- 配置页增删改单个明确标的测试

## 10. 参考文档

- Next.js Deploying: https://nextjs.org/docs/app/getting-started/deploying
- Vercel Next.js: https://vercel.com/docs/frameworks/nextjs
- Vercel Postgres: https://vercel.com/docs/postgres
- Neon on Vercel: https://vercel.com/marketplace/neon/
- Drizzle Neon: https://orm.drizzle.team/docs/connect-neon
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Financial Modeling Prep Docs: https://site.financialmodelingprep.com/developer/docs/stable
- CoinGecko Docs: https://docs.coingecko.com/
- FRED API: https://fred.stlouisfed.org/docs/api/fred/series_observations.html
