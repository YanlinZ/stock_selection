import { createDailyDecisionSnapshotRecords } from "./decision-snapshots";
import { createDashboardRepository, type DashboardRepository } from "./repository";
import { createDashboardSnapshot } from "./snapshot";

export { createDailyDecisionSnapshotRecords } from "./decision-snapshots";
export {
  createDashboardSnapshot,
  createUnavailableDashboardSnapshot
} from "./snapshot";
export { dashboardRuleVersion } from "./shared";

type Clock = {
  now(): Date;
};

const defaultClock: Clock = {
  now: () => new Date()
};

export function createDashboardService({
  clock = defaultClock,
  repository = createDashboardRepository()
}: {
  clock?: Clock;
  repository?: DashboardRepository;
} = {}) {
  return {
    async getDashboardSnapshot() {
      const snapshot = createDashboardSnapshot(
        await repository.getDashboardInputs(),
        clock.now()
      );

      try {
        await repository.persistDailyDecisionSnapshots?.(
          createDailyDecisionSnapshotRecords(snapshot)
        );
      } catch {
        // Snapshot persistence is a replay aid; Dashboard rendering should degrade safely.
      }

      return snapshot;
    }
  };
}
