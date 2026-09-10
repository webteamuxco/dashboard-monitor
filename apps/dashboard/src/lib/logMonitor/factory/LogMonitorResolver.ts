import "server-only";
import type {
  LogMonitorFactoryInterface,
} from "./LogMonitorFactoryInterface";
import { LogMonitorStrategyInterface } from "../strategy/LogMonitorStrategyInterface";
import { LOG_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";


const STRATEGY_RESOLVER = LOG_MONITOR_STRATEGY_ENUM

export class LogMonitorResolver {

  constructor(private readonly factories: LogMonitorFactoryInterface<LogMonitorStrategyInterface>[]) {}

  resolve(
    wiring: ToolWiring,
  ): LogMonitorFactoryInterface<LogMonitorStrategyInterface> {

    for (const factory of this.factories) {
      if (factory.support(wiring, STRATEGY_RESOLVER)) {
        return factory;
      }
    }

    throw new Error(
      `No LogMonitorFactory supports type "${STRATEGY_RESOLVER}" for Strapi element "${wiring.id}". Please check its strategy and its tool in admin.`,
    );
  }
}
