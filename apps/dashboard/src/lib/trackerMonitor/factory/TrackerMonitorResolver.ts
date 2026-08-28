import "server-only";
import type {
  TrackerMonitorFactoryInterface,
} from "./TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "../strategy/TrackerMonitorStrategyInterface";
import { TRACKER_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";

const STRATEGY_RESOLVER = TRACKER_MONITOR_STRATEGY_ENUM

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
