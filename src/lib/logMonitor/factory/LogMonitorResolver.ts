import "server-only";
import type {
  LogMonitorFactoryInterface,
} from "./LogMonitorFactoryInterface";
import { LogMonitorStrategyInterface } from "../strategy/LogMonitorStrategyInterface";


const STRATEGY_RESOLVER = "log-monitor"

export class LogMonitorResolver {

  constructor(private readonly factories: LogMonitorFactoryInterface<LogMonitorStrategyInterface>[]) {}

  async resolve(
    documentId: string,
  ): Promise<LogMonitorFactoryInterface<LogMonitorStrategyInterface>> {
    
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
