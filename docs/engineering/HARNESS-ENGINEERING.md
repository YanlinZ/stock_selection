# Harness Engineering 定义

版本：v2026.05.12

## 1. 结论

本项目采用的 `Harness Engineering` 与 AI coding agent 语境下的最佳实践一致。

项目早期文档中的 `harness` 主要用于描述 Phase 1 的数据源、fixture、provider contract 和 ingestion 入库夹具。这个用法不是错误，但定义过窄。2026-05-12 起，项目统一将其明确为：

> Harness Engineering 是围绕 AI coding agent 和代码库建立上下文、约束、工具、契约、测试、可观测性和反馈循环，使 agent 产出的系统可验证、可追踪、可重跑、可解释失败原因，并能在较少人工反复盯守下稳定迭代。

简化表达：

> Human steers. Agent executes. Harness makes the work legible, constrained, observable, and self-correcting.

## 2. 与外部语境的一致性

项目定义与以下公开语境一致：

- OpenAI 在 “Harness engineering: leveraging Codex in an agent-first world” 中强调，工程师的重点从手写代码转向设计环境、表达意图、构建反馈循环，让 Codex agents 可靠工作。
- Martin Fowler 网站上的 “Harness engineering for coding agent users” 将 coding agent 用户侧 harness 描述为 feedforward guides 和 feedback sensors：前者在 agent 行动前约束和引导，后者在 agent 行动后观察并帮助自我修正。

本项目采用同一思想，但落到个人交易 Dashboard 的工程边界上：文档、测试、fixture、provider contract、数据状态、code review agent、production smoke 都属于 harness 的组成部分。

参考：

- https://openai.com/index/harness-engineering/
- https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html

## 3. 项目内定义

本项目中的 harness 包括四类要素：

### 3.1 Feedforward guides

在 agent 开始改代码前提供方向和边界：

- `AGENTS.md`
- PRD
- 技术开发计划
- Code Review Agent 协议
- phase scope 和 out-of-scope 约束
- provider/ingestion/schema 命名与职责边界
- 不泄露 secret、不实现真实下单、不扩展 MVP 的项目规则

### 3.2 Feedback sensors

在 agent 改完或运行中提供反馈：

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- provider contract tests
- fixture tests
- ingestion idempotency tests
- `/api/health`
- `/settings` 数据状态 UI
- production smoke
- Code Review Agent

### 3.3 可观测与可追踪

让失败和数据状态对 agent 与用户都可见：

- `provider_raw_responses`
- `market_data_daily`
- `macro_observations`
- `ingestion_runs`
- raw response 与 normalized data 分离
- provider 状态、最近更新时间、stale、错误状态展示

### 3.4 可重跑与可解释

让同一个任务可以反复验证，不依赖一次性运气：

- fake provider
- fixture response
- adapter contract
- 幂等 upsert
- structured error message
- production redeploy 后 smoke test

## 4. Phase 1 中的具体落地

Phase 1 的 `provider harness` 和 `ingestion harness` 是完整 Harness Engineering 的一个具体子集。

它们解决的问题是：

- 真实金融 API 可能限流、失败、返回结构变化。
- 本地开发或 CI 不应依赖真实 API 才能验证。
- 原始 provider payload 与内部业务结构必须隔离。
- 数据刷新失败不能只存在 server logs 中，必须进入可见状态。
- 重复刷新不能制造不可控重复数据。

因此 Phase 1 中以下内容都属于 harness：

- provider interface。
- FMP、CoinGecko、FRED normalizer。
- fake provider。
- fixture tests。
- raw response 保存。
- normalized data upsert。
- ingestion run 状态。
- provider status UI。
- production `/api/health` 和 `/settings` smoke。

## 5. 术语使用约定

后续文档中应尽量避免单独说 “harness” 而不加限定。

优先使用：

- `provider harness`
- `ingestion harness`
- `schema harness`
- `Dashboard data harness`
- `review harness`
- `production smoke harness`

当讨论整体 AI-assisted development 方法论时，使用：

- `Harness Engineering`
- `AI coding agent harness`
- `feedforward guides`
- `feedback sensors`

## 6. 定义变更记录

2026-05-12：

- 将项目内 `harness` 定义从“围绕数据源、入库、标准化、状态展示的工程夹具和契约”澄清为更完整的 AI coding agent Harness Engineering。
- 保留 Phase 1 数据管线语境下的 `provider harness`、`ingestion harness` 用法。
- 明确旧定义是具体落地，不是完整定义。
- 新增本文档作为项目统一定义源，避免后续 agent 把 harness 误解为单纯 fixture 或测试工具。
