import { describe, expect, it } from "vitest";

import { createDashboardReviewTasks } from "./review-tasks";
import type {
  DashboardHistoryEntry,
  DashboardHistoryOutcomeWindow,
  DashboardPlanStatusSnapshot
} from "./types";

describe("createDashboardReviewTasks", () => {
  it("returns an empty queue when there are no history entries", () => {
    expect(createDashboardReviewTasks([])).toEqual([]);
  });

  it("derives factual ready, pending, and insufficient review tasks from history outcomes", () => {
    const tasks = createDashboardReviewTasks([
      createHistoryEntry({
        outcomes: [
          createOutcome({
            outcomeClose: 101,
            outcomeDate: "2026-05-04",
            returnPercent: 1,
            status: "ready",
            tradingDays: 1
          }),
          createOutcome({
            message: "仍在等待 5 个交易日后的 normalized price。",
            status: "pending",
            tradingDays: 5
          }),
          createOutcome({
            entryClose: null,
            entryDate: null,
            message: "缺少可关联标的，无法计算 normalized price outcome。",
            status: "insufficient_data",
            tradingDays: 20
          })
        ]
      })
    ]);

    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({
      actionKind: "consider_small_add",
      actionLabel: "今日重点观察：QQQ",
      basisDate: "2026-05-01",
      confidence: "high",
      dataQuality: "complete",
      entryClose: 100,
      entryDate: "2026-05-01",
      evidenceCounts: {
        missing: 1,
        opposing: 0,
        risks: 1,
        supporting: 2
      },
      id: "2026-05-01:opportunity:instrument_QQQ:dashboard-rules-v4.0.0:1",
      instrumentId: "instrument_QQQ",
      message: "已到 1D 观察窗口，可人工复盘。",
      outcomeClose: 101,
      outcomeDate: "2026-05-04",
      planStatus: expect.objectContaining({
        label: "已触发",
        status: "triggered"
      }),
      priority: 1,
      returnPercent: 1,
      ruleVersion: "dashboard-rules-v4.0.0",
      scope: "opportunity",
      snapshotDate: "2026-05-01",
      status: "ready",
      subjectKey: "instrument_QQQ",
      symbol: "QQQ",
      tradingDays: 1
    });
    expect(tasks[1]).toMatchObject({
      message: "等待 5 个交易日后的 normalized price，再进行人工复盘。",
      status: "pending",
      tradingDays: 5
    });
    expect(tasks[2]).toMatchObject({
      message: "数据不足：缺少可关联标的，无法计算 normalized price outcome。",
      status: "insufficient_data",
      tradingDays: 20
    });
    expect(tasks.map((task) => task.message).join(" ")).not.toMatch(
      /成功|失败|规则有效|规则无效|自动复盘结论|建议修改规则/
    );
  });

  it("orders ready triggered or invalidated tasks first, then scope, window, and recency", () => {
    const tasks = createDashboardReviewTasks([
      createHistoryEntry({
        planStatus: createPlanStatus({ label: "仍有效", status: "still_valid" }),
        scope: "opportunity",
        subjectKey: "instrument_QQQ",
        symbol: "QQQ"
      }),
      createHistoryEntry({
        actionLabel: "持仓观察 TSLA",
        planStatus: createPlanStatus({ label: "已触发", status: "triggered" }),
        scope: "holding",
        subjectKey: "instrument_TSLA",
        symbol: "TSLA"
      }),
      createHistoryEntry({
        actionLabel: "机会观察 NVDA",
        planStatus: createPlanStatus({ label: "已失效", status: "invalidated" }),
        scope: "opportunity",
        snapshotDate: "2026-04-30",
        subjectKey: "instrument_NVDA",
        symbol: "NVDA"
      }),
      createHistoryEntry({
        actionLabel: "总判断",
        instrumentId: null,
        planStatus: createPlanStatus({ label: "仍有效", status: "still_valid" }),
        scope: "summary",
        subjectKey: "summary",
        symbol: null
      }),
      createHistoryEntry({
        actionLabel: "等待观察 MSFT",
        outcomes: [createOutcome({ status: "pending", tradingDays: 1 })],
        planStatus: createPlanStatus({ label: "已触发", status: "triggered" }),
        scope: "opportunity",
        subjectKey: "instrument_MSFT",
        symbol: "MSFT"
      }),
      createHistoryEntry({
        actionLabel: "数据不足 AMZN",
        outcomes: [
          createOutcome({
            entryClose: null,
            entryDate: null,
            status: "insufficient_data",
            tradingDays: 1
          })
        ],
        planStatus: createPlanStatus({ label: "已失效", status: "invalidated" }),
        scope: "opportunity",
        subjectKey: "instrument_AMZN",
        symbol: "AMZN"
      })
    ]);

    expect(tasks.map((task) => `${task.status}:${task.symbol ?? task.subjectKey}:${task.tradingDays}D`))
      .toEqual([
        "ready:NVDA:1D",
        "ready:TSLA:1D",
        "ready:QQQ:1D",
        "ready:summary:1D",
        "pending:MSFT:1D",
        "insufficient_data:AMZN:1D"
      ]);
    expect(tasks.map((task) => task.priority)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("limits the lightweight queue to twelve tasks", () => {
    const entries = Array.from({ length: 15 }, (_, index) =>
      createHistoryEntry({
        snapshotDate: `2026-05-${String(index + 1).padStart(2, "0")}`,
        subjectKey: `instrument_${index}`,
        symbol: `SYM${index}`
      })
    );

    const tasks = createDashboardReviewTasks(entries);

    expect(tasks).toHaveLength(12);
    expect(tasks[0]?.symbol).toBe("SYM14");
    expect(tasks[11]?.symbol).toBe("SYM3");
  });
});

function createHistoryEntry(
  overrides: Partial<DashboardHistoryEntry> = {}
): DashboardHistoryEntry {
  return {
    actionKind: "consider_small_add",
    actionLabel: "今日重点观察：QQQ",
    basisDate: "2026-05-01",
    confidence: "high",
    dataQuality: "complete",
    dataSources: [],
    evidence: {
      missing: [
        {
          basisDate: "2026-05-01",
          detail: null,
          impact: "missing",
          label: "缺少成交量确认",
          source: "market_data_daily"
        }
      ],
      opposing: [],
      risks: [
        {
          basisDate: "2026-05-01",
          detail: null,
          impact: "negative",
          label: "宏观风险仍需观察",
          source: "macro_observations"
        }
      ],
      supporting: [
        {
          basisDate: "2026-05-01",
          detail: "接近长期加仓价位",
          impact: "positive",
          label: "关键价位接近",
          source: "key_price_levels"
        },
        {
          basisDate: "2026-05-01",
          detail: "短期均线未破坏",
          impact: "positive",
          label: "技术结构可接受",
          source: "market_data_daily"
        }
      ]
    },
    generatedAt: "2026-05-01T13:00:00.000Z",
    instrumentId: "instrument_QQQ",
    outcomes: [createOutcome()],
    planStatus: createPlanStatus(),
    ruleVersion: "dashboard-rules-v4.0.0",
    scope: "opportunity",
    snapshotDate: "2026-05-01",
    subjectKey: "instrument_QQQ",
    symbol: "QQQ",
    ...overrides
  };
}

function createOutcome(
  overrides: Partial<DashboardHistoryOutcomeWindow> = {}
): DashboardHistoryOutcomeWindow {
  return {
    entryClose: 100,
    entryDate: "2026-05-01",
    message: "已观察到 1 个交易日后的收盘价。",
    outcomeClose: 101,
    outcomeDate: "2026-05-04",
    returnPercent: 1,
    status: "ready",
    tradingDays: 1,
    ...overrides
  };
}

function createPlanStatus(
  overrides: Partial<DashboardPlanStatusSnapshot> = {}
): DashboardPlanStatusSnapshot {
  return {
    basisDate: "2026-05-01",
    distancePercent: 1,
    distanceText: "+1.0%",
    label: "已触发",
    latestPrice: 106,
    latestPriceDate: "2026-05-11",
    levelPrice: 105,
    levelType: "long_term_add",
    message: "最新价格已触发长期加仓关键价位。",
    status: "triggered",
    ...overrides
  };
}
