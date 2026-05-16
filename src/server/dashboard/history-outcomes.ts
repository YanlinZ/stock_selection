import type {
  DashboardDecisionSnapshotRecord,
  DashboardHistoryOutcomeTradingDays,
  DashboardHistoryOutcomeWindow,
  DashboardMarketDataPoint
} from "./types";

const outcomeWindows: DashboardHistoryOutcomeTradingDays[] = [1, 5, 20];
const staleDataCalendarDayThreshold = 7;

export function calculateDashboardHistoryOutcomes({
  asOfDate,
  marketData,
  snapshot
}: {
  asOfDate: string;
  marketData: DashboardMarketDataPoint[];
  snapshot: DashboardDecisionSnapshotRecord;
}): DashboardHistoryOutcomeWindow[] {
  if (!snapshot.instrumentId) {
    return outcomeWindows.map((tradingDays) =>
      createInsufficientWindow({
        message: "缺少可关联标的，无法计算 normalized price outcome。",
        tradingDays
      })
    );
  }

  if (!snapshot.basisDate) {
    return outcomeWindows.map((tradingDays) =>
      createInsufficientWindow({
        message: "缺少 basis date，无法定位 entry close。",
        tradingDays
      })
    );
  }

  const basisDate = snapshot.basisDate;
  const prices = marketData
    .filter((point) => point.instrumentId === snapshot.instrumentId)
    .toSorted((left, right) => left.date.localeCompare(right.date));
  const entryIndex = prices.findIndex((point) => point.date >= basisDate);

  if (entryIndex < 0) {
    return outcomeWindows.map((tradingDays) =>
      createInsufficientWindow({
        message: "缺少 basis date 当日或之后的 normalized close。",
        tradingDays
      })
    );
  }

  const entry = prices[entryIndex];
  const entryClose = entry?.close ?? null;

  if (!entry || entryClose === null || entryClose <= 0) {
    return outcomeWindows.map((tradingDays) =>
      createInsufficientWindow({
        message: "entry close 不可用，无法计算表现。",
        tradingDays
      })
    );
  }

  return outcomeWindows.map((tradingDays) => {
    const outcomeIndex = entryIndex + tradingDays;
    const observedPrices = prices.slice(entryIndex, Math.min(outcomeIndex + 1, prices.length));

    if (hasLargeDateGap(observedPrices)) {
      return createInsufficientWindow({
        entryClose,
        entryDate: entry.date,
        message: "normalized daily price 序列存在明显断裂，暂不计算表现。",
        tradingDays
      });
    }

    const outcome = prices[outcomeIndex];

    if (!outcome) {
      const latestPriceDate = prices.at(-1)?.date ?? entry.date;
      const isStale = calendarDayDifference(latestPriceDate, asOfDate) > staleDataCalendarDayThreshold;

      return isStale
        ? createInsufficientWindow({
            entryClose,
            entryDate: entry.date,
            message: `缺少 ${tradingDays} 个交易日后的 normalized close。`,
            tradingDays
          })
        : {
            entryClose,
            entryDate: entry.date,
            message: `仍在等待 ${tradingDays} 个交易日后的 normalized price。`,
            outcomeClose: null,
            outcomeDate: null,
            returnPercent: null,
            status: "pending",
            tradingDays
          };
    }

    return {
      entryClose,
      entryDate: entry.date,
      message: `已观察到 ${tradingDays} 个交易日后的收盘价。`,
      outcomeClose: outcome.close,
      outcomeDate: outcome.date,
      returnPercent: ((outcome.close - entryClose) / entryClose) * 100,
      status: "ready",
      tradingDays
    };
  });
}

function createInsufficientWindow({
  entryClose = null,
  entryDate = null,
  message,
  tradingDays
}: {
  entryClose?: number | null;
  entryDate?: string | null;
  message: string;
  tradingDays: DashboardHistoryOutcomeTradingDays;
}): DashboardHistoryOutcomeWindow {
  return {
    entryClose,
    entryDate,
    message,
    outcomeClose: null,
    outcomeDate: null,
    returnPercent: null,
    status: "insufficient_data",
    tradingDays
  };
}

function hasLargeDateGap(prices: DashboardMarketDataPoint[]) {
  for (let index = 1; index < prices.length; index += 1) {
    const previous = prices[index - 1];
    const current = prices[index];

    if (
      previous &&
      current &&
      calendarDayDifference(previous.date, current.date) > staleDataCalendarDayThreshold
    ) {
      return true;
    }
  }

  return false;
}

function calendarDayDifference(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();

  return Math.floor((end - start) / 86_400_000);
}
