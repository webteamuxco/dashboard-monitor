import "server-only";
import type {
  TrackerMonitorFactoryInterface,
} from "./TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "../strategy/TrackerMonitorStrategyInterface";
import { TRACKER_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

const STRATEGY_RESOLVER = TRACKER_MONITOR_STRATEGY_ENUM

export class TrackerMonitorResolver {

  constructor(private readonly factories: TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface>[]) {}

  resolve(
    wiring: ToolWiring,
  ): TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface> {

    for (const factory of this.factories) {
      if (factory.support(wiring, STRATEGY_RESOLVER)) {
        return factory;
      }
    }

    throw new Error(
      `No TrackerMonitorFactory supports type "${STRATEGY_RESOLVER}" for Strapi element "${wiring.id}". Please check its strategy and its tool in admin.`,
    );
  }
}
