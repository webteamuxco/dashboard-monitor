import "server-only";
import type {
  TrackerMonitorFactoryInterface,
} from "./TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "../strategy/TrackerMonitorStrategyInterface";

const STRATEGY_RESOLVER = "tracker-monitor"

export class TrackerMonitorResolver {

  constructor(private readonly factories: TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface>[]) {}

  async resolve(
    documentId: string,
  ): Promise<TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface>> {

    for (const factory of this.factories) {
      if (await factory.support(documentId, STRATEGY_RESOLVER)) {
        return factory;
      }
    }

    throw new Error(
      `No TrackerMonitorFactory supports type "${STRATEGY_RESOLVER}". Please add missing Mapped tools in admin.`,
    );
  }
}
