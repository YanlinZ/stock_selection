# stock_selection 技术开发计划

版本：v2026.05.11

相对 `docs/TECH-PLAN-v2026.05.10.md` 的关键变化：

- 记录 Phase 0 已完成并合入 `main`。
- 将当前阶段推进到 Phase 1：配置页与数据入库。
- 明确 Phase 1 采用 harness engineering 方法论。
- 补充 Phase 1 的边界、成功定义、数据契约与推荐实施顺序。

## 1. 当前阶段

当前项目处于：

> Phase 1：配置页与数据入库阶段

Phase 0 已完成：

- Next.js App Router + TypeScript + Tailwind 工程已初始化。
- Drizzle ORM + Neon Postgres migration 流程已建立。
- Vercel Production 已部署成功。
- 简单密码保护已接入。
- `/api/health` 已验证 Production 环境与数据库连接正常。
- 正式访问地址：`https://stock-selection-pi.vercel.app`

Phase 1 的目标不是输出交易建议，也不是实现完整 Dashboard，而是搭好后续分析所需的个人配置、基础数据入库和可验证数据管线。

Phase 1 完成后，Phase 2 应可以基于稳定的 normalized data 开始实现 Dashboard v1。

## 2. 技术栈选择

### 2.1 Web 应用

- 前端与全栈框架：Next.js App Router
- UI 框架：React + TypeScript
- 样式：Tailwind CSS
- 组件：shadcn/ui 风格的本地组件
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

继续使用：

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

Phase 1 默认不接 AI。AI 解释层从 Phase 3 开始再进入主路径。

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
FMP_API_KEY=""
COINGECKO_API_KEY=""
FRED_API_KEY=""
OPENAI_API_KEY=""
AUTH_SECRET="replace-with-random-secret"
APP_ACCESS_PASSWORD="replace-with-local-password"
```

注意：

- `.env.local` 不提交到 Git。
- 不要把 API key、token、账户凭证写入代码、测试 fixture 或文档示例的真实值中。
- 仓库中只保留 `.env.example`，并使用空值或占位符。
- `AUTH_SECRET` 应使用随机长字符串，例如 `openssl rand -base64 32`。

## 4. 多电脑开发策略

不推荐使用纯本地 SQLite 作为默认方案。

推荐方式：

- 本地开发连接云端 `stock_selection_dev` 数据库。
- Vercel 线上环境连接云端 `stock_selection_prod` 数据库。
- 后续如果需要更严谨的多人协作或预览环境，再增加 preview database branch。

每台新电脑的理想启动流程：

```text
git clone repo
pnpm install
配置 .env.local
pnpm db:migrate
pnpm dev
```

## 5. 部署与运维策略

当前 Production：

- Vercel project canonical：`stock-selection`
- Production 域名：`https://stock-selection-pi.vercel.app`
- 健康检查：`https://stock-selection-pi.vercel.app/api/health`

Production 必须配置：

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_ACCESS_PASSWORD`

如果缺少 `AUTH_SECRET` 或 `APP_ACCESS_PASSWORD`，Vercel build 可能成功，但 `/api/health` 会返回 `503 degraded`。

Vercel 注意事项：

- GitHub PR checks 中可能同时出现 `stock-selection` 和 `stock-selection-w5bi` 两个 Vercel 项目。
- 当前 canonical production 是 `stock-selection`，正式域名是 `stock-selection-pi.vercel.app`。
- 如果 Vercel 报错 `No Output Directory named "public" found after the Build completed`，优先检查 Vercel Project Settings：Framework Preset 应为 Next.js，Output Directory 不应配置为 `public`。
- 修改 Vercel 项目设置或环境变量后，需要 redeploy 才会对已有 commit 生效。

## 6. Harness Engineering 方法论

Phase 1 采用 harness engineering 作为核心工程方法。

这里的 harness 指围绕数据源、入库、标准化、状态展示建立可验证的工程夹具和契约，使系统在真实 API 不稳定、限流、返回结构变化或本地无网络时仍可测试、可解释、可迭代。

Phase 1 的 harness 原则：

- 先定义接口和可验证契约，再接真实数据源。
- 每个外部 provider 都必须有 fake/fixture harness，可以离线测试。
- 所有入库流程都要可追踪、可重跑、可解释失败原因。
- UI 只消费 normalized data，不直接依赖 provider 原始返回。
- provider 原始返回必须可保存，方便排查和未来重新 normalize。
- 失败状态是产品体验的一部分，不能只在 server logs 中可见。

Phase 1 的重点不是尽快拉到数据，而是建立一个之后不容易乱的数据接入框架。

## 7. Phase 1 范围

### 7.1 Phase 1 In Scope

配置页 v1：

- 持仓列表
- 关注列表
- 个人关键加仓价
- 基础偏好配置

数据库 schema v1：

- instruments / assets
- holdings
- watchlist items
- key price levels
- user preferences
- provider raw responses
- normalized market / macro data
- ingestion runs / sync logs

数据 adapter v1：

- FMP：美股/ETF 基础行情、历史日线。
- CoinGecko：BTC/ETH 基础行情。
- FRED：利率/宏观序列基础数据。

Harness：

- fake provider
- fixture response
- adapter contract tests
- normalizer tests
- ingestion idempotency tests

数据状态展示：

- 最近更新时间
- provider 成功/失败状态
- 数据是否 stale
- 错误信息可见但不泄露 secret

### 7.2 Phase 1 Out Of Scope

Phase 1 不做：

- 不输出买卖建议。
- 不做 Dashboard v1 的完整交易判断。
- 不做 AI 摘要或 AI 解释。
- 不做新闻/财报深度理解。
- 不做自动定时任务，最多先支持手动刷新或内部 server action/API。
- 不做券商同步。
- 不做主动推送。
- 不做分钟级/秒级行情。
- 不引入多用户账号系统。

## 8. Phase 1 成功定义

Phase 1 完成时，必须满足：

- 用户能在线上配置并保存持仓、关注列表、关键价位和基础偏好。
- 配置数据存入 Neon Postgres，redeploy 后仍然存在。
- 手动触发数据刷新后，系统能从 FMP、CoinGecko、FRED 获取基础数据。
- 每次 provider 返回都能保存 raw response，并产生 normalized data。
- provider 失败时 UI 不崩，能显示失败来源和错误状态。
- 同一批数据重复刷新不会制造不可控重复记录。
- 所有 provider adapter 能用 fixture 离线测试，不依赖真实 API 才能跑测试。
- `pnpm check` 通过。
- Vercel Production 部署通过，`/api/health` 保持 `status: ok`。
- 没有任何 API key、token、真实 secret 进入 Git。

Phase 1 完成后，系统可以没有完整 Dashboard 交易判断，但必须已经具备可信、可追踪、可测试的数据基础。

## 9. Phase 1 推荐实施顺序

### 9.1 Schema Harness

先定义表结构、migration、基础 repository/service 层。

重点：

- schema 命名清晰。
- 支持单用户个人应用，但不要把未来多用户扩展完全堵死。
- 所有时间字段明确时区语义。
- 关键表有创建时间、更新时间。
- provider 数据表能追踪 provider、endpoint、symbol、请求参数、响应时间和错误状态。

验收：

- migration 可生成、可执行。
- schema 单元测试或 repository 测试覆盖基础读写。
- 不需要真实 provider API。

### 9.2 Config Vertical Slice

实现配置页的第一条垂直切片。

重点：

- 能增删改单个持仓。
- 能增删改单个关注标的。
- 能维护个人关键加仓价。
- 表单验证清晰，错误信息不夸张。
- UI 以配置任务为中心，不做营销式页面。

验收：

- 本地和 Production 都能保存配置。
- redeploy 后数据仍存在。
- 配置页受密码保护。

### 9.3 Provider Contract

定义 FMP、CoinGecko、FRED adapter interface 和 fixture tests。

重点：

- provider client 只负责获取数据。
- normalizer 只负责转换成内部结构。
- 业务逻辑不依赖 provider 原始字段。
- fixture 中不得包含真实 API key。

验收：

- fake provider 可以离线跑通。
- adapter contract tests 可以验证关键字段缺失、空响应、错误响应。

### 9.4 Ingestion Harness

实现 raw response 保存、normalized 写入、ingestion run 状态。

重点：

- ingestion run 记录开始、成功、失败、耗时。
- raw response 与 normalized output 可关联。
- 失败可重试。
- 重复刷新尽量幂等，不制造不可控重复数据。

验收：

- 成功、失败、部分成功都有可见状态。
- provider 错误不会导致页面崩溃。

### 9.5 Real Provider 接入

在 contract 与 ingestion harness 之后接入真实 API。

重点：

- 先接最小数据面，不贪多。
- 先支持用户持仓与关注列表中的 symbols。
- 对 provider 限流、超时、空结果做明确处理。
- API key 只从环境变量读取。

验收：

- 手动刷新可拉取 FMP、CoinGecko、FRED 基础数据。
- raw response 和 normalized data 都能落库。
- 真实 provider 失败时不会影响配置页基本使用。

### 9.6 Data Status UI

在配置页或健康页展示数据状态。

重点：

- 最近刷新时间。
- provider 级别状态。
- stale 状态。
- 最近一次错误。
- 不泄露 secret、完整请求 URL 中的 key 或敏感响应。

验收：

- 用户能看懂数据是否可用。
- 出错时知道是哪个 provider 或哪个 symbol 失败。

### 9.7 Production Smoke

部署到 Vercel Production 后做冒烟验收。

验收：

- `pnpm check` 通过。
- Vercel Production build 通过。
- `/api/health` 为 `status: ok`。
- 线上配置保存正常。
- 线上手动刷新基础数据正常。
- GitHub PR checks 通过。

## 10. 数据建模初稿

Phase 1 schema 可以从以下概念开始，具体字段在实现前再细化：

- `instruments`
  - 标的基础信息，例如 symbol、name、assetType、currency、exchange、provider metadata。
- `holdings`
  - 用户持仓配置，例如 symbol、holdingType、costBasis、positionSize、notes、active。
- `watchlist_items`
  - 用户关注列表，例如 symbol、priority、theme、active。
- `key_price_levels`
  - 个人关键价位，例如 symbol、levelType、price、currency、notes。
- `user_preferences`
  - 基础偏好配置，例如风险偏好、默认观察周期、是否关注反弹模式。
- `provider_raw_responses`
  - provider 原始响应，例如 provider、endpoint、requestKey、status、payload、fetchedAt。
- `market_data_daily`
  - 标准化日线数据，例如 symbol、date、open、high、low、close、volume、provider。
- `macro_observations`
  - 标准化宏观数据，例如 seriesId、date、value、provider。
- `ingestion_runs`
  - 刷新任务状态，例如 source、status、startedAt、finishedAt、errorMessage。

建模原则：

- 先满足个人单用户，但保留未来加 `userId` 的空间。
- raw response 与 normalized data 分离。
- provider 字段和内部业务字段分离。
- 避免把交易建议字段提前塞入 Phase 1 schema。

## 11. 测试策略

Phase 1 必须覆盖：

- 配置表单 validation。
- 配置 repository/service 基础读写。
- provider adapter contract。
- provider fixture parsing。
- normalizer 输出 schema。
- ingestion run 成功/失败状态。
- 幂等刷新或重复数据控制。
- `/api/health` 不因预留 API key 缺失而失败。

优先测试真实风险点：

- provider 返回空数组。
- provider 返回字段缺失。
- provider 限流或 401。
- symbol 不存在。
- 数据日期过旧。
- 重复刷新同一 symbol/date。

## 12. 后续开发节奏

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

## 13. 核心工程原则

- 保持 MVP 克制，优先 Dashboard + 简单配置页。
- 规则和阈值尽量配置化，不散落硬编码。
- 买卖建议必须包含原因、风险和依据日期。
- 保存分析输入、规则版本、数据更新时间，方便追溯。
- 数据过旧或信息不足时，默认降级为“不操作”或“观察”。
- 扩展机会每天最多 1 个。
- 不实现真实下单功能。
- 不接券商账户，除非用户明确要求并重新定义安全边界。
- Phase 1 中 UI 不直接读取 provider 原始响应。
- Phase 1 中真实 provider 接入不得绕过 fake provider 和 fixture tests。

## 14. 参考文档

- Next.js Deploying: https://nextjs.org/docs/app/getting-started/deploying
- Vercel Next.js: https://vercel.com/docs/frameworks/nextjs
- Vercel Postgres: https://vercel.com/docs/postgres
- Neon on Vercel: https://vercel.com/marketplace/neon/
- Drizzle Neon: https://orm.drizzle.team/docs/connect-neon
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Financial Modeling Prep Docs: https://site.financialmodelingprep.com/developer/docs/stable
- CoinGecko Docs: https://docs.coingecko.com/
- FRED API: https://fred.stlouisfed.org/docs/api/fred/series_observations.html
