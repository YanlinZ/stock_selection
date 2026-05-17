import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DashboardHistorySnapshot } from "@/server/dashboard/types";

import { DashboardHistoryView } from "./dashboard-history-view";

describe("DashboardHistoryView", () => {
  it("renders a clear empty state", () => {
    const html = renderToStaticMarkup(
      DashboardHistoryView({
        history: {
          entries: [],
          generatedAt: "2026-05-16T12:00:00.000Z",
          reviewTasks: [],
          status: "empty"
        }
      })
    );

    expect(html).toContain("待人工复盘");
    expect(html).toContain("暂无待人工复盘事项");
    expect(html).toContain("还没有可追踪历史判断");
    expect(html).toContain("返回 Dashboard");
  });

  it("renders ready, pending, and insufficient outcome states without review conclusions", () => {
    const html = renderToStaticMarkup(
      DashboardHistoryView({
        history: createHistorySnapshot()
      })
    );

    expect(html).toContain("历史判断");
    expect(html).toContain("待人工复盘");
    expect(html).toContain("3 项");
    expect(html).toContain("已到观察窗口");
    expect(html).toContain("等待复盘数据");
    expect(html).toContain("复盘数据不足");
    expect(html).toContain("已到 1D 观察窗口，可人工复盘。");
    expect(html).toContain("等待 5 个交易日后的 normalized price，再进行人工复盘。");
    expect(html).toContain("数据不足：缺少可用 normalized price。");
    expect(html).toContain("支持 1");
    expect(html).toContain("风险 1");
    expect(html).toContain("今日重点观察：QQQ");
    expect(html).toContain("计划状态");
    expect(html).toContain("已触发");
    expect(html).toContain("1D");
    expect(html).toContain("+1.0%");
    expect(html).toContain("等待数据");
    expect(html).toContain("数据不足");
    expect(html).toContain("dashboard-rules-v4.0.0");
    expect(html).not.toContain("成功");
    expect(html).not.toContain("失败");
    expect(html).not.toContain("规则有效");
    expect(html).not.toContain("规则无效");
    expect(html).not.toContain("自动复盘结论");
    expect(html).not.toContain("建议修改规则");
  });
});

function createHistorySnapshot(): DashboardHistorySnapshot {
  return {
    entries: [
      {
        actionKind: "consider_small_add",
        actionLabel: "今日重点观察：QQQ",
        basisDate: "2026-05-01",
        confidence: "high",
        dataQuality: "complete",
        dataSources: [],
        evidence: {
          missing: [],
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
            }
          ]
        },
        generatedAt: "2026-05-01T13:00:00.000Z",
        instrumentId: "instrument_QQQ",
        planStatus: {
          basisDate: "2026-05-01",
          distancePercent: 1,
          distanceText: "+1.0%",
          label: "已触发",
          latestPrice: 106,
          latestPriceDate: "2026-05-11",
          levelPrice: 105,
          levelType: "long_term_add",
          message: "最新价格已触发长期加仓关键价位。",
          status: "triggered"
        },
        outcomes: [
          {
            entryClose: 100,
            entryDate: "2026-05-01",
            message: "已观察到 1 个交易日后的收盘价。",
            outcomeClose: 101,
            outcomeDate: "2026-05-04",
            returnPercent: 1,
            status: "ready",
            tradingDays: 1
          },
          {
            entryClose: 100,
            entryDate: "2026-05-01",
            message: "仍在等待 5 个交易日后的 normalized price。",
            outcomeClose: null,
            outcomeDate: null,
            returnPercent: null,
            status: "pending",
            tradingDays: 5
          },
          {
            entryClose: null,
            entryDate: null,
            message: "缺少可用 normalized price。",
            outcomeClose: null,
            outcomeDate: null,
            returnPercent: null,
            status: "insufficient_data",
            tradingDays: 20
          }
        ],
        ruleVersion: "dashboard-rules-v4.0.0",
        scope: "opportunity",
        snapshotDate: "2026-05-01",
        subjectKey: "instrument_QQQ",
        symbol: "QQQ"
      }
    ],
    generatedAt: "2026-05-16T12:00:00.000Z",
    reviewTasks: [
      {
        actionKind: "consider_small_add",
        actionLabel: "今日重点观察：QQQ",
        basisDate: "2026-05-01",
        confidence: "high",
        dataQuality: "complete",
        entryClose: 100,
        entryDate: "2026-05-01",
        evidenceCounts: {
          missing: 0,
          opposing: 0,
          risks: 1,
          supporting: 1
        },
        id: "2026-05-01:opportunity:instrument_QQQ:dashboard-rules-v4.0.0:1",
        instrumentId: "instrument_QQQ",
        message: "已到 1D 观察窗口，可人工复盘。",
        outcomeClose: 101,
        outcomeDate: "2026-05-04",
        planStatus: {
          basisDate: "2026-05-01",
          distancePercent: 1,
          distanceText: "+1.0%",
          label: "已触发",
          latestPrice: 106,
          latestPriceDate: "2026-05-11",
          levelPrice: 105,
          levelType: "long_term_add",
          message: "最新价格已触发长期加仓关键价位。",
          status: "triggered"
        },
        priority: 1,
        returnPercent: 1,
        ruleVersion: "dashboard-rules-v4.0.0",
        scope: "opportunity",
        snapshotDate: "2026-05-01",
        status: "ready",
        subjectKey: "instrument_QQQ",
        symbol: "QQQ",
        tradingDays: 1
      },
      {
        actionKind: "consider_small_add",
        actionLabel: "今日重点观察：QQQ",
        basisDate: "2026-05-01",
        confidence: "high",
        dataQuality: "complete",
        entryClose: 100,
        entryDate: "2026-05-01",
        evidenceCounts: {
          missing: 0,
          opposing: 0,
          risks: 1,
          supporting: 1
        },
        id: "2026-05-01:opportunity:instrument_QQQ:dashboard-rules-v4.0.0:5",
        instrumentId: "instrument_QQQ",
        message: "等待 5 个交易日后的 normalized price，再进行人工复盘。",
        outcomeClose: null,
        outcomeDate: null,
        planStatus: {
          basisDate: "2026-05-01",
          distancePercent: 1,
          distanceText: "+1.0%",
          label: "已触发",
          latestPrice: 106,
          latestPriceDate: "2026-05-11",
          levelPrice: 105,
          levelType: "long_term_add",
          message: "最新价格已触发长期加仓关键价位。",
          status: "triggered"
        },
        priority: 2,
        returnPercent: null,
        ruleVersion: "dashboard-rules-v4.0.0",
        scope: "opportunity",
        snapshotDate: "2026-05-01",
        status: "pending",
        subjectKey: "instrument_QQQ",
        symbol: "QQQ",
        tradingDays: 5
      },
      {
        actionKind: "consider_small_add",
        actionLabel: "今日重点观察：QQQ",
        basisDate: "2026-05-01",
        confidence: "high",
        dataQuality: "complete",
        entryClose: null,
        entryDate: null,
        evidenceCounts: {
          missing: 0,
          opposing: 0,
          risks: 1,
          supporting: 1
        },
        id: "2026-05-01:opportunity:instrument_QQQ:dashboard-rules-v4.0.0:20",
        instrumentId: "instrument_QQQ",
        message: "数据不足：缺少可用 normalized price。",
        outcomeClose: null,
        outcomeDate: null,
        planStatus: {
          basisDate: "2026-05-01",
          distancePercent: 1,
          distanceText: "+1.0%",
          label: "已触发",
          latestPrice: 106,
          latestPriceDate: "2026-05-11",
          levelPrice: 105,
          levelType: "long_term_add",
          message: "最新价格已触发长期加仓关键价位。",
          status: "triggered"
        },
        priority: 3,
        returnPercent: null,
        ruleVersion: "dashboard-rules-v4.0.0",
        scope: "opportunity",
        snapshotDate: "2026-05-01",
        status: "insufficient_data",
        subjectKey: "instrument_QQQ",
        symbol: "QQQ",
        tradingDays: 20
      }
    ],
    status: "ready"
  };
}
