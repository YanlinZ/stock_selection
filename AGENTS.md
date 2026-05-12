# AGENTS.md

本文件是给后续 AI coding/product agents 的项目工作说明。请在开始任何工作前先阅读本文件，再从最早版本到最新版本通读 PRD，然后阅读最新技术开发计划。

## 项目概览

项目名：`stock_selection`

项目目标：构建一个个人美股/加密交易决策 Dashboard，结合用户持仓、关注列表、宏观环境、基本面、财报、新闻与技术分析，帮助用户快速判断今天是否应该：

- 不操作
- 观察
- 小仓试探
- 加仓
- 减仓
- 止盈
- 退出

产品核心不是股票信息聚合，而是高信噪比、可解释的个人交易决策辅助。

## 当前阶段

当前处于：

> Phase 1 已完成：Phase 2 Dashboard v1 准备中

Phase 0 已完成并合入 `main`。工程底座已经包括 Next.js App Router、TypeScript、Tailwind、Drizzle、Neon Postgres、Vercel 部署、简单密码保护和健康检查。

Phase 1 已完成配置页与数据入库 harness。这里的 `harness` 遵守 AI coding agent 语境下的 Harness Engineering 定义：围绕 agent 和代码库建立上下文、约束、工具、契约、测试、状态可观测性和反馈循环，让 AI 生成和维护的系统可验证、可追踪、可重跑、可解释失败原因。项目统一定义见 `docs/engineering/HARNESS-ENGINEERING.md`。除非用户明确要求实现代码，否则不要主动扩展 MVP 范围或实现交易分析业务。下一阶段应进入 Phase 2 Dashboard v1，但仍需保持 MVP 克制，不提前实现 Phase 3 的新闻/财报深度理解或 AI 解释层。

Phase 1 已完成部分：

- 建立第一版数据库表和 migration。
- 实现持仓、关注列表、个人关键加仓价配置页。
- 配置页已支持新增、编辑和软停用。
- 建立 FMP、CoinGecko、FRED provider contract、fixture/fake provider 和离线测试，作为 Phase 1 provider harness。
- 实现 ingestion harness：保存 raw response、写入 normalized data、记录 ingestion run 状态并控制重复刷新。
- 接入 FMP、CoinGecko、FRED 的真实 API 读取路径。
- 在配置页展示 provider 刷新状态、最近更新时间、stale/错误状态。
- Vercel Production 已配置 `FMP_API_KEY`、`COINGECKO_API_KEY`、`FRED_API_KEY`。
- 2026-05-12 UTC 已完成 Production redeploy 和手动刷新 smoke：`/api/health` 为 `status: ok`，provider key 检查为 true，刷新批次成功写入 normalized data。

Phase 2 当前重点：

- 基于 Phase 1 normalized data 实现 Dashboard v1。
- 实现今日总判断、宏观状态、持仓状态、技术位与行动建议。
- 实现 8/21/50/200 日均线、前高前低、成交量变化、关键价位接近判断。
- 实现宏观双评分和恐慌反弹模式。
- 暂不接 AI 摘要，不做新闻/财报深度理解，不做自动定时任务。

## 当前工程状态

Phase 0 验收结果：

- `main` 已合并 Phase 0 工程初始化。
- Vercel Production 已部署成功。
- 正式访问地址：`https://stock-selection-pi.vercel.app`
- 线上 `/api/health` 已验证为 `status: ok`。
- Neon Postgres 连接已验证可用。
- Production 环境已配置 `DATABASE_URL`、`AUTH_SECRET`、`APP_ACCESS_PASSWORD`。

注意：`FMP_API_KEY`、`COINGECKO_API_KEY`、`FRED_API_KEY` 是 Phase 1 真实数据刷新依赖；`OPENAI_API_KEY` 仍是后续 AI 阶段预留，不应因为健康检查中显示为 `false` 就误判当前阶段失败。

Phase 1 当前进展：

- `main` 已合并 Phase 1 schema harness。
- `main` 已合并 Phase 1 配置页 vertical slice。
- `main` 已合并 Phase 1 provider contract：FMP、CoinGecko、FRED adapter 契约、normalizer、fake provider 和 fixture tests。
- `main` 已合并 Phase 1 ingestion：真实 provider、raw response 保存、normalized data upsert、ingestion run 状态和配置页数据状态 UI。
- Phase 1 不包含交易建议、完整 Dashboard、AI 摘要、新闻/财报深度理解或自动定时任务。
- `docs/prd/PRD-v2026.05.11.md` 已记录后续版本的复盘与自我迭代机制，该机制不进入 Phase 1 实现范围。
- 2026-05-11 已对当前 `DATABASE_URL` 执行 `pnpm db:migrate`，并验证 Phase 1 的 9 张表全部存在。
- 2026-05-11 已验证 `/settings` 本地页面显示 `可编辑`，不再显示 `需要迁移`。
- 2026-05-12 UTC 已运行 `pnpm check`，typecheck、lint、7 个测试文件、25 个测试通过。
- 2026-05-12 UTC 已配置 Production provider API keys 并 redeploy；线上 `/api/health` 显示 `FMP_API_KEY`、`COINGECKO_API_KEY`、`FRED_API_KEY` 为 `true`，`OPENAI_API_KEY` 仍未配置且不属于 Phase 1 依赖。
- 2026-05-12 UTC 已在 Production `/settings` 手动刷新数据，批次结果为 `3/3 成功，0 失败，89 行入库`。当时 Production 配置中没有 active crypto 标的，因此 CoinGecko key 已配置但未被刷新计划使用；本地已用同一 key 验证 CoinGecko 官方 API 可返回 BTC 数据。

## 部署与运维注意

- Vercel Production 必须配置 `DATABASE_URL`、`AUTH_SECRET`、`APP_ACCESS_PASSWORD`。
- Phase 1 真实数据刷新还必须配置 `FMP_API_KEY`、`COINGECKO_API_KEY`、`FRED_API_KEY`。
- 如果缺少 `AUTH_SECRET` 或 `APP_ACCESS_PASSWORD`，Vercel build 可能仍然成功，但 `/api/health` 会返回 `503 degraded`。
- GitHub PR checks 中可能同时出现 `stock-selection` 和 `stock-selection-w5bi` 两个 Vercel 项目。当前 canonical production 是 `stock-selection`，正式域名是 `stock-selection-pi.vercel.app`。
- 如果 Vercel 报错 `No Output Directory named "public" found after the Build completed`，优先检查 Vercel Project Settings：Framework Preset 应为 Next.js，Output Directory 不应配置为 `public`。
- Vercel 修改项目设置或环境变量后，需要 redeploy 才会对已有 commit 生效。
- 如果 `/settings` 显示 `需要迁移` 或 `数据库未就绪`，优先确认当前 `DATABASE_URL` 是否指向预期数据库，再执行 `pnpm db:migrate`。
- 如果 `/settings` 中某个 provider 显示 `未运行`，先检查当前配置是否存在会触发该 provider 的 active 标的。例如 CoinGecko 只会在 active crypto 标的进入刷新计划时运行。

## Harness Engineering 定义

项目采用 AI coding agent 语境下的 Harness Engineering，而不是仅指传统测试夹具。

本项目中，harness 指围绕 AI agent 和代码库建立的外层控制系统，包括：

- Feedforward guides：`AGENTS.md`、PRD、技术计划、领域边界、命名和架构约束。
- Feedback sensors：typecheck、lint、unit tests、fixture tests、provider contract tests、production smoke、code review agent。
- 可观测和可追踪性：raw response、normalized data、ingestion run、数据状态 UI、错误状态。
- 可重跑和可解释性：fake provider、fixture、幂等 upsert、明确失败来源。

2026-05-12 已澄清：早期文档中 “harness” 多用于 Phase 1 数据源和入库夹具，这是 Harness Engineering 在当前项目的一个具体落地，不是完整定义。后续文档应尽量使用更精确的短语，例如 `provider harness`、`ingestion harness`、`review harness`、`Dashboard data harness`。

## 主要文档

第一版 PRD 源文件：

- `docs/prd/PRD-v2026.05.10.md`

当前 PRD 增量更新：

- `docs/prd/PRD-v2026.05.11.md`

当前技术开发计划：

- `docs/tech/TECH-PLAN-v2026.05.12.md`

后续如产生新版 PRD，请使用新的日期版本号创建新文件：

- `docs/prd/PRD-vYYYY.MM.DD.md`

新版 PRD 应尽量说明相对上一版的关键变化。除非用户明确要求，不要覆盖旧版 PRD。

后续如产生新版技术开发计划，请使用新的日期版本号创建新文件：

- `docs/tech/TECH-PLAN-vYYYY.MM.DD.md`

新版技术计划应尽量说明相对上一版的关键变化。除非用户明确要求，不要覆盖旧版技术计划。

## 工作前必读顺序

开始任何开发、设计或产品判断前，必须按顺序阅读：

1. `AGENTS.md`
2. 所有 PRD，按版本从早到晚阅读
3. 最新技术开发计划

不得只凭记忆或对话摘要开始实现。

## Code Review Agent

当用户要求使用 code review agent、review agent、独立审查或 PR review 时，对应 agent 必须先阅读并遵守：

- `docs/process/CODE-REVIEW-AGENT.md`

主 agent 在以下场景应默认拉起 Code Review Agent 进行独立 review：

- 非纯文档、非极小改动的 PR。
- 涉及数据库 schema、migration、provider、ingestion、server action、auth、secret、部署、数据状态 UI 或核心业务边界的变更。
- 用户明确要求 review、approve 或 merge。
- 主 agent 判断变更存在较高回归风险、数据一致性风险、phase 边界风险或安全风险。

默认流程：

- 主 agent 完成实现、自测和 PR 后，拉起 Code Review Agent review。
- Code Review Agent 只审查，不主动改代码。
- 如发现 blocking issue，主 agent 修复后再请求复审。
- 如用户已授权自动合并，Code Review Agent 必须按 `docs/process/CODE-REVIEW-AGENT.md` 的 Approve / Merge Protocol 等待 checks 全部通过后，才可 approve 并 merge。

## 产品原则

开发或设计时必须遵守以下原则：

- 少而准，宁可不推荐，也不要推荐低质量机会。
- 所有买卖建议必须可解释，不能黑盒式给结论。
- 机会扫描以持仓和关注列表为主。
- 扩展机会每天最多 1 个，且必须非常有价值。
- 没有高质量机会时，应明确保持安静，不强行推荐次优机会。
- 系统是交易决策辅助，不执行真实交易。
- MVP 默认不主动推送，避免制造交易冲动。

产品最不能犯的错误：

- 推荐太多低质量机会。
- 给出买卖建议但原因说不清楚。

## MVP 范围

MVP 只包含两个页面：

1. Dashboard
   - 今日一句话总判断
   - 宏观市场状态
   - 持仓状态
   - 异常关注股
   - 最多 1 个扩展机会
   - 财报/基本面状态
   - 技术位与行动建议

2. 简单配置页
   - 持仓列表
   - 关注列表
   - 个人关键加仓价
   - 基础偏好配置

MVP 暂不做：

- 券商同步
- 主动推送通知
- 高频盯盘
- 全市场大量机会推荐
- 复杂交易历史/复盘
- 完整历史财报趋势图
- 每只股票的手动投资逻辑卡

## 用户偏好摘要

用户主要是长期持仓，但关注 1-5 个交易日的短线反弹机会。

当前已知持仓示例：

- BTC
- ETH
- TLT
- GOOGL
- PDD
- MSFT
- TSLA
- NET

关注列表约 20 个，主要集中在：

- 加密相关
- AI 相关
- 大科技
- 半导体
- 金融科技

当前个人关键价位：

- BTC：60000 附近
- ETH：1800 附近
- TSLA：300 附近
- HOOD：70 附近

## 核心分析框架

### 宏观模块

宏观模块采用双评分：

- 市场风险评分：衡量市场是否恐慌、破位、不稳定。
- 反弹机会评分：衡量是否出现可观察的大盘或优质资产反弹机会。

核心指标：

- VIX
- SPY/QQQ
- TLT 或 10 年期美债收益率
- BTC/ETH
- SMH/XLK
- CPI、FOMC、非农、财报季等重要事件

注意：对用户而言，`VIX > 25` 不是单纯负面信号，也可能是 TQQQ/SOXL 等高弹性工具的加仓/博反弹信号。

### 短线反弹机会

短线反弹机会需要综合：

- 异常下跌
- 技术/价格到位
- 大盘状态支持或至少不继续拖累
- 基本面长期逻辑未坏
- 情绪悲观或恐慌释放

硬排除：

- 业务长期逻辑被破坏
- 小盘股、流动性差、用户不了解的公司
- 生物医药、MEME 股、纯情绪炒作标的

### 技术分析

重点技术指标：

- 8日、21日、50日、200日均线
- 缺口回补
- 前高/前低
- 支撑/压力位
- 背离
- 成交量放大/缩小

从观察到小仓试探的信号：

- 回补缺口后止跌
- 出现底背离
- 缩量回调到支撑
- 跌到 21日/50日/200日均线附近

从小仓试探到加仓的信号：

- 财报/新闻解释后确认基本面没坏
- 利空消息被市场消化，股价不再继续跌
- 没有跌破前低，形成更高低点

退出/放弃信号：

- 大盘继续崩
- 跌破前低
- 基本面被证伪
- 放量破位

止盈信号：

- 接近前高
- 接近压力位
- 接近缺口上沿
- 接近关键均线压力区

## 数据与实现边界

MVP 数据策略：

- 优先使用稳定、公开或低成本数据源。
- 主要基于日线和收盘数据。
- 盘中数据只做轻量修正。
- 不做秒级或分钟级交易终端。

每日更新节奏：

- 美股收盘后生成基础分析。
- 美股开盘前进行轻量更新。
- 盘中打开 Dashboard 时，检查计划是否接近、触发、失效或仍有效。

后续如接入真实金融数据：

- 不要提交 API key、token、账户凭证或任何秘密信息。
- 所有密钥必须通过环境变量或安全配置读取。
- 不要在代码或测试 fixture 中硬编码真实账户信息。
- 涉及最新行情、财报、法规或数据源可用性时，需要验证最新信息。

## 代码实现约束

当用户明确要求开始实现时：

- 先检查最新 PRD，不要凭记忆实现。
- 先检查最新技术开发计划，并遵守当前 phase 的范围和验收标准。
- 保持 MVP 范围克制，优先实现 Dashboard + 简单配置页。
- 规则和阈值应尽量配置化，不要散落硬编码。
- 分离数据获取、分析规则、AI 摘要、UI 展示。
- 买卖建议必须包含原因、风险和依据日期。
- 不实现真实下单功能。
- 不接券商账户，除非用户明确要求并重新定义安全边界。
- 不引入大规模重构或复杂架构，除非产品进入实现阶段且确有必要。
- 每完成一次 implementation 后，需要重新阅读 `AGENTS.md`，检查是否有需要更新的点。如果有，不要自行更新，应先询问用户确认后再更新。

## 文档协作约定

- 面向用户的产品文档使用中文。
- 重要产品决策应写入 PRD，而不是只留在对话中。
- 新增需求如果改变 MVP 范围，应在 PRD 中标注为 MVP 内或后续版本。
- 如果发现需求冲突，先明确冲突点，再向用户提出一个问题澄清。
