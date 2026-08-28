import "server-only";
import type { ErrorMonitorFactoryInterface } from "./ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "../strategy/ErrorMonitorStrategyInterface";
import { ERROR_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";

const STRATEGY_RESOLVER = ERROR_MONITOR_STRATEGY_ENUM

export class ErrorMonitorResolver {

  constructor(private readonly factories: ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>[]) {}

  async resolve(
    documentId: string,
  ): Promise<ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>> {
    for (const factory of this.factories) {
      if (await factory.support(documentId, STRATEGY_RESOLVER)) {
        return factory;
      }
    }

    throw new Error(
      `No ErrorMonitorFactory supports type "${STRATEGY_RESOLVER}". Please add missing Mapped tools in admin.`,
    );
  }
}
