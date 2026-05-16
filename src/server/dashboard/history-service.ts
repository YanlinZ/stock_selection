import { createDashboardRepository, type DashboardRepository } from "./repository";
import { createDashboardHistorySnapshot } from "./history";

type Clock = {
  now(): Date;
};

const defaultClock: Clock = {
  now: () => new Date()
};

const defaultHistoryLimit = 50;
const defaultHistoryDays = 30;

export function createDashboardHistoryService({
  clock = defaultClock,
  repository = createDashboardRepository()
}: {
  clock?: Clock;
  repository?: DashboardRepository;
} = {}) {
  return {
    async getDashboardHistorySnapshot() {
      const now = clock.now();
      const input = repository.getDashboardHistoryInputs
        ? await repository.getDashboardHistoryInputs({
            limit: defaultHistoryLimit,
            sinceDate: toDateString(subtractUtcDays(now, defaultHistoryDays))
          })
        : {
            decisionSnapshots: [],
            marketData: []
          };

      return createDashboardHistorySnapshot(input, {
        asOfDate: toDateString(now),
        generatedAt: now
      });
    }
  };
}

function subtractUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}
