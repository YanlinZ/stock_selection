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
          status: "empty"
        }
      })
    );

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
    status: "ready"
  };
}
