import "server-only";
import type { ErrorMonitorFactoryInterface } from "./ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "../strategy/ErrorMonitorStrategyInterface";
import { ERROR_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

const STRATEGY_RESOLVER = ERROR_MONITOR_STRATEGY_ENUM

export class ErrorMonitorResolver {

  constructor(private readonly factories: ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>[]) {}

  resolve(
    wiring: ToolWiring,
  ): ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface> {
    for (const factory of this.factories) {
      if (factory.support(wiring, STRATEGY_RESOLVER)) {
        return factory;
      }
    }

    throw new Error(
      `No ErrorMonitorFactory supports type "${STRATEGY_RESOLVER}" for Strapi element "${wiring.id}". Please check its strategy and its tool in admin.`,
    );
  }
}
