# stock_selection 技术开发计划

版本：v2026.05.14-phase-2.1-hardening

本文件基于 `docs/tech/TECH-PLAN-v2026.05.14.md` 的 Phase 2 完成态、当前 QA 问题清单和代码现状，规划下一个开发阶段。

`docs/tech/TECH-PLAN-v2026.05.14.md` 继续作为 Phase 2 Dashboard v1 完成状态记录有效；本文件是下一阶段执行计划。

## 相对上一版的关键变化

- 将下一阶段定义为 Phase 2.1：Post-merge hardening / Settings 与 auth 可用性收敛。
- 不直接进入原路线图中的 Phase 3 AI 解释、新闻/财报理解或自动机会扩展。
- 将 `docs/qa/ONLINE-QA-ISSUES-v2026.05.12.md` 中仍 open 或待复测的问题纳入本阶段验收。
- 记录当前代码已经出现的部分修复迹象，但要求通过本地 smoke、测试和生产 QA 重新确认后才能关闭 QA issue。
- 明确 Phase 2.1 完成后，才能重新决定是否进入后续产品扩展阶段。
- 2026-05-14 Planner Agent next-step handoff 确认当前下一步是 reviewer gate、PR checks、merge/deploy 和 production targeted QA，不进入 Phase 3 扩展；随后 PR #28 已合并且 Vercel deployment checks 已通过，当前只剩 production targeted QA 与文档收尾。

## 0. Planner Gate

Goal：

- 让 Phase 2 Dashboard v1 和 Phase 1 Settings 配置闭环在真实浏览器与生产环境中稳定可用。
- 关闭或重测当前 QA issue，消除会误导后续 agent 的状态漂移。

Scope：

- 包含 auth/session、受保护路由 `next`、Settings server action 提交闭环、移动端导航、停用确认、基础偏好、表单数字约束、Dashboard post-merge 复测和 QA 文档状态同步。
- 明确不包含 AI 摘要、新闻/财报深度理解、自动定时任务、券商同步、主动推送、分钟级/秒级行情、全市场推荐、真实下单、复盘与自我迭代机制。

Plan：

1. 对齐当前代码、QA issue 和测试状态。
2. 补齐 auth/settings 关键路径的自动化测试或可复测 smoke。
3. 完成 Settings UX 与移动端导航的剩余可用性收敛。
4. 做 Dashboard 与受保护路由回归。
5. 更新 QA issue 状态并记录 production targeted QA。
6. 通过 review gate 后再决定是否进入后续产品扩展。

Validation：

- 迭代中优先跑受影响测试；合并前跑 `pnpm check`。
- 对 auth、Settings server action、移动端导航和 Dashboard 路由跑本地浏览器 smoke。
- 合并部署后按 QA 协议跑 production targeted QA，并保存运行记录。

Risks：

- Next server action 在生产环境中的 cookie/session 行为可能与单元测试不同。
- 生产配置是用户真实配置，测试数据只能逐条创建、逐条确认停用，不能批量清理。
- 如果只更新代码不更新 QA issue，后续 agent 会继续把已修路径当作 open bug。
- 如果跳过本阶段直接做 Phase 3，容易把基础配置闭环和 Dashboard 可信度风险带入更复杂能力。

Handoff：

- Main Agent 执行实现和本地 smoke。
- Reviewer Agent 在 diff 完成后做 read-only review gate。
- QA Agent 或 Main Agent 按 QA 协议执行 post-merge targeted QA。

## 1. 当前状态

当前项目处于：

> Phase 2.1：Dashboard v1 post-merge hardening 与 Settings/auth 可用性收敛阶段；PR #28 已合并且 Vercel deployment checks 已通过，production targeted QA 已部分通过，等待停用确认分支与移动端生产视口短复测。

已知基础状态：

- Phase 0 工程地基已完成。
- Phase 1 配置页、provider contract、ingestion harness、normalized data 已完成。
- Phase 2 Dashboard v1 已完成并合入 `main`。
- Dashboard v1 消费 normalized data，不读取 provider raw response。
- 当前 branch：`codex/phase-2-1-hardening`。
- 当前最新 commit：`c658f41 fix: harden phase 2.1 settings flows`。
- PR #28：`https://github.com/yanlin-zhou/stock-selection/pull/28`，2026-05-14 05:07:52 UTC merged，merge commit `d00c4b1850acd2597345aa5f1558e99b43ce80c4`。
- Vercel deployment checks：`stock-selection` 与 `stock-selection-w5bi` 已通过。

当前代码观察：

- `src/proxy.ts` 和 `src/app/(protected)/layout.tsx` 已有受保护路径 `next` 处理。
- `src/app/(protected)/settings/actions.ts` 已有 action token fallback，用于 server action 提交时恢复 root access cookie。
- `src/components/app-shell.tsx` 已采用窄屏 icon-only 导航，目标是让 Settings、Health、退出在移动端可达。
- `src/components/confirm-submit-button.tsx` 与 Settings 页面中的停用表单已提供确认。
- `src/app/(protected)/settings/page.tsx` 已展示基础偏好配置，并对若干数字字段提供 `min`/`max` 约束。

这些观察只能作为计划输入。QA issue 的状态必须以测试和生产复测结果为准，不因源码看起来已修就直接关闭。

本地验证记录：

- `docs/qa/runs/QA-RUN-v2026.05.14-phase-2.1.md` 记录了 local hardening run。
- 已记录的本地覆盖包含 auth redirect、Settings server action auth fallback、持仓添加/保存、停用确认存在性、基础偏好、数字字段约束、Dashboard `/` 与 `/dashboard`、360px/390px/414px 移动端导航。
- 已记录的命令包含 targeted tests、`pnpm typecheck`、`pnpm lint`、`pnpm check`、`pnpm build` 和本地 HTTP/browser smoke。
- 生产 targeted QA 记录见 `docs/qa/runs/QA-RUN-v2026.05.14-production-targeted.md`。
- 已关闭：QA-003、QA-004、QA-006、QA-007。
- 仍为 `Fixed pending retest`：QA-001 的停用确认后提交分支、QA-002 的生产移动端视口、QA-005 的停用确认取消/确认分支。

## 2. 本阶段目标

Phase 2.1 的目标不是扩展新交易能力，而是完成当前 MVP 的稳定闭环：

- 用户能稳定登录、退出，并从受保护 URL 登录后回到原目标页。
- Settings 中持仓、关注列表、关键价位、基础偏好和数据刷新提交后仍停留在预期页面。
- 停用操作有明确确认，不会误伤生产配置。
- 360px、390px、414px 移动端宽度下顶部导航和 Settings 表单可用。
- `/` 与 `/dashboard` 在本地和生产登录态中展示 Dashboard v1，不回到 Phase 0 文案或默认 404。
- 当前 QA issue 状态与真实代码/生产表现一致。

## 3. In Scope

### 3.1 Auth 与受保护路由

- 保留安全 `next` path，不允许外部 URL 跳转。
- 未登录访问 `/settings`、`/health`、`/dashboard` 后，登录成功应回到原路径。
- 退出后应清理已知 path-scoped access cookies。
- server action 提交后不能因为 cookie/path 差异跳回 `/login`。
- 测试覆盖重复 cookie、stale cookie、`next-action` spoofing 和安全 redirect。

### 3.2 Settings 编辑闭环

- 新增、保存、停用持仓后仍留在 `/settings`。
- 新增、保存、停用关注标的后仍留在 `/settings`。
- 新增、保存、停用关键价位后仍留在 `/settings`。
- 保存基础偏好后仍留在 `/settings`，并在刷新后保持。
- 手动刷新数据后展示 batch/provider 状态，不泄露 secret。

### 3.3 Settings UX 与校验

- 停用操作必须有确认，或在产品文档中明确延期理由；默认优先确认。
- 成本价、关键价位、优先级、短线观察天数等数字字段要有前端约束。
- 若继续依赖浏览器原生约束，QA issue 中应明确该验收口径；若用户体验不足，再补字段级错误反馈。
- 基础偏好配置应作为当前 Phase 1/2 MVP 的最小入口保留。

### 3.4 Dashboard 与移动端

- `/` 与 `/dashboard` 都应展示 Dashboard v1。
- Dashboard 在无数据、stale、unavailable 情况下不崩溃。
- 交易指导仍必须包含 reasons、risks 和 data date。
- 360px、390px、414px 下导航入口全部可达，不横向溢出。

### 3.5 QA 与文档同步

- 重测并更新 `docs/qa/ONLINE-QA-ISSUES-v2026.05.12.md`。
- 对 post-merge targeted QA 新增运行记录，建议路径：`docs/qa/runs/QA-RUN-v2026.05.14-phase-2.1.md`。
- 若某个问题选择延期，必须写清延期原因、恢复条件和不阻塞本阶段的理由。

## 4. Out Of Scope

Phase 2.1 不做：

- 不接 AI 摘要或 AI 解释。
- 不做新闻/财报深度理解。
- 不做自动定时任务或 Vercel Cron。
- 不做券商同步。
- 不做主动推送。
- 不做分钟级/秒级行情。
- 不做全市场大量机会推荐。
- 不实现真实下单。
- 不实现复盘与自我迭代机制。
- 不引入完整多用户账号系统。

原路线图中的 Phase 3 能力必须在 Phase 2.1 完成后重新规划。若后续要推进，建议先拆成更小阶段，例如规则化异常机会扫描和 AI 解释层分开评审。

## 5. 推荐实施顺序

### 5.1 状态对齐与基线测试

先确认当前代码和文档状态：

- 读取当前 `git status`，确认没有未识别的用户改动。
- 跑 auth、login、logout、protected layout、protected navigation 的定向测试。
- 对照 QA-001 到 QA-007，标记哪些已有源码迹象、哪些已有测试、哪些仍缺真实浏览器证据。

验收：

- 形成明确的 issue-by-issue 判断：已修待复测、仍需实现、或需产品决策。

### 5.2 Auth 与 Settings server action hardening

优先关闭 QA-001 和 QA-004：

- 保持 `next` redirect 只接受安全本地 path。
- 确认 protected GET/HEAD 与 server action 提交使用一致的 session 识别策略。
- 若现有 `actionToken` fallback 保留，补足测试或抽出可测 helper。
- 对保存、停用、刷新这类 server action 提交做真实浏览器 smoke。

验收：

- 新增、保存、停用、刷新数据后不跳回 `/login`。
- 未登录直达 `/settings` 或 `/health`，登录后回原路径。
- 外部 `next` 不会离开本站。

### 5.3 Settings UX 收敛

处理 QA-005、QA-006、QA-007：

- 验证停用确认可以取消，取消后不改变数据。
- 验证基础偏好入口可保存并重新读取。
- 验证数字字段负数、越界值不能写入无效数据。
- 若浏览器原生校验不足以让用户理解问题，再补字段级中文错误反馈。

验收：

- Settings 页面满足 Phase 1 配置维护闭环。
- 对每个软停用操作都有确认或明确记录的产品决策。
- QA issue 状态与实际验收结果一致。

### 5.4 移动端与 Dashboard 回归

处理 QA-002 和 QA-003：

- 在 360px、390px、414px 宽度下检查顶部导航。
- 打开 `/` 和 `/dashboard`，确认 Dashboard v1 可展示。
- 检查 Dashboard 的 empty/stale/unavailable 状态。

验收：

- Settings、Health、退出都可见可点。
- `/dashboard` 不返回 404。
- 首页不再展示 Phase 0 工程地基作为主状态。

### 5.5 QA issue 与运行记录

在代码和 smoke 稳定后更新 QA 文档：

- 修复已合并但 production 未复测的问题标为 `Fixed pending retest`。
- production 复测通过后标为 `Closed`。
- 任何延期项标为 `Deferred`，并写明恢复条件。
- 新增 QA run 记录，包含 tested scope、commands、passed/failed、skipped coverage 和 next action。

验收：

- 后续 agent 只读 `context-map`、最新 tech plan 和 QA issue 就能理解真实剩余工作。

## 6. QA Issue 出口标准

| ID | 本阶段出口标准 |
| --- | --- |
| QA-001 | Settings 所有核心 server action 提交后不跳回登录，production 或 preview 真实点击复测通过。 |
| QA-002 | 360px、390px、414px 下 Settings、Health、退出可达且无横向溢出。 |
| QA-003 | `/` 和 `/dashboard` 展示 Dashboard v1；生产登录态复测通过后关闭。 |
| QA-004 | 未登录直达受保护路径，登录后回到原路径；外部 `next` 被清洗。 |
| QA-005 | 停用前确认可取消；确认后仅影响明确目标记录。 |
| QA-006 | Settings 有基础偏好最小入口，保存后可读取；或明确延期但默认不延期。 |
| QA-007 | 数字字段无效值被浏览器或字段级错误阻止，且不写入无效数据、不泄露内部异常。 |

## 7. Validation Plan

定向测试：

```bash
pnpm test src/lib/http.test.ts src/lib/auth/session.test.ts src/app/api/login/route.test.ts 'src/app/(protected)/layout.test.ts' src/app/logout/route.test.ts src/components/protected-navigation.test.ts
```

受影响服务测试：

```bash
pnpm test src/server/config/service.test.ts src/server/ingestion/service.test.ts src/server/dashboard/service.test.ts src/components/dashboard/dashboard-view.test.ts
```

合并前检查：

```bash
pnpm check
pnpm build
```

本地 smoke：

- Auth/local smoke：错误密码、正确登录、刷新 protected page、直接打开 `/settings`、退出。
- `next` smoke：未登录打开 `/settings`、`/health`，登录后返回原路径；外部 `next` 不跳站。
- Settings smoke：添加测试持仓、保存、刷新、确认停用；关注列表和关键价位同理。
- Settings preferences smoke：保存基础偏好并刷新确认。
- Data refresh smoke：安全时点击刷新，确认 provider 状态可读且无 secret。
- Dashboard smoke：打开 `/` 和 `/dashboard`，确认 Dashboard v1 与降级状态。
- Responsive smoke：至少 390px，建议补 360px 和 414px。

Production targeted QA：

- 合并并部署后按 `docs/process/QA-AGENT.md` 与 `docs/qa/ONLINE-QA-REGRESSION-v2026.05.12.md` 选取本阶段路径。
- 不用 HTML/API 只读替代 Settings 表单真实点击闭环。
- 生产测试数据必须清晰命名，且只逐条停用明确测试记录。

## 8. Review Gate

Reviewer 重点检查：

- 是否仍守住 Dashboard plus simple settings 的 MVP 边界。
- server action、protected route、logout 和 login redirect 是否一致且安全。
- 表单是否保留用户上下文并避免泄露内部异常。
- Dashboard 是否继续只消费 normalized data。
- 移动端导航是否可达。
- QA issue 状态是否有测试证据支持。
- 是否有 secret、cookie、database URL 或真实账户信息进入代码、日志、fixture 或文档。

## 9. Phase 2.1 Done When

Phase 2.1 完成必须满足：

- QA-001 到 QA-007 均为 `Closed`、`Fixed pending retest` 或有明确理由的 `Deferred`。
- `pnpm check` 通过。
- `pnpm build` 通过，或明确记录跳过原因。
- 本地 smoke 覆盖 auth、Settings、Dashboard 和移动端导航。
- production targeted QA 结果已记录。
- 最新 tech plan 和 context routing 指向本阶段真实状态。
- 没有引入 AI、新闻、broker sync、真实下单或其他越界能力。

## 10. 进入后续 Phase 的条件

只有 Phase 2.1 完成后，才重新评估产品扩展。

建议下一次产品扩展不要直接做一个大 Phase 3，而是先做 scope split：

- Phase 3A：规则化异常机会扫描，继续保持无 AI、无新闻深度理解、每日最多 1 个扩展机会。
- Phase 3B：AI 解释层与新闻/财报上下文，需要用户明确确认、更新 PRD/tech plan、配置 `OPENAI_API_KEY` 和新增安全/成本/失败降级策略。
- Phase 4：更新节奏、计划状态追踪和每日历史报告。

这些只是候选方向，不属于 Phase 2.1 的默认执行范围。

## 11. 当前下一步执行计划

2026-05-14 Planner Agent 结论，已按 PR #28 合并和 Vercel deployment checks 通过后的真实状态收敛：

Goal：

- 完成 Phase 2.1 收尾闭环：补齐 production deactivate confirm/cancel 和 mobile navigation 短复测，并同步 QA issue 与运行记录状态。

Scope：

- 包含 QA-001 停用确认后提交、QA-002 production mobile navigation、QA-005 停用确认取消/确认、QA run 记录、QA issue 状态更新、context/tech plan 状态同步。
- 明确不包含 broker sync、real trading、push notifications、high-frequency data、full-market recommendations、AI summaries、新闻/财报深度理解或自动定时任务。

Plan：

1. 用手动或可控浏览器在 production 创建一个明确测试记录，验证 `停用` 取消不改变数据，确认后仅停用该记录，且不跳回 `/login`。
2. 在 production 390px 视口验证 Settings、Health、退出入口均可达；建议补 360px 和 414px。
3. 按 production 结果更新 QA-001、QA-002、QA-005：通过改 `Closed`，失败回 `Open` 或继续保留 `Fixed pending retest` 并记录最小复现。
4. 更新或新增 QA run，记录环境、范围、通过/失败项、跳过项和 next action。
5. 同步 `docs/context-map.md`、本文件和根 `AGENTS.md`；若全部通过，再单独规划后续 MVP 内的小范围 Dashboard/Settings polish。

Validation：

- 本地代码若继续改动：补跑 `pnpm check`、`pnpm build`。
- 已通过的 production targeted QA：`/login`、`/`、`/dashboard`、`/settings`、`/health`、`/api/health`，以及 Settings 新增/保存/刷新/基础偏好/数字字段约束。
- 剩余 production smoke：停用确认取消/确认分支；移动端至少 390px，建议补 360px 和 414px。

Risks：

- Production cookie/session 行为在新增、保存、刷新路径已通过；停用确认后提交仍需短复测。
- 生产测试数据只能逐条创建、逐条确认停用；不能批量删除或批量清理。
- 如果只合并代码不更新 QA 文档，后续 agent 会继续误判 Phase 2.1 状态。
- 若 QA 失败，下一轮只修失败路径，继续守住 Dashboard plus simple settings 边界。

Handoff：

- 推荐顺序：QA Agent 或 Main Agent 做剩余 production short retest -> Main Agent 更新 QA issue/run/context/tech docs -> 若全部通过，再决定是否进入下一轮计划。
