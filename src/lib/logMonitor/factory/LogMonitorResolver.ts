import "server-only";
import type {
  LogMonitorFactoryInterface,
} from "./LogMonitorFactoryInterface";
import { LogMonitorStrategyInterface } from "../strategy/LogMonitorStrategyInterface";


const STRATEGY_RESOLVER = "log-monitor"

export class LogMonitorResolver {

  constructor(private readonly factories: LogMonitorFactoryInterface<LogMonitorStrategyInterface>[]) {}

  resolve(
    documentId: string,
  ): LogMonitorFactoryInterface<LogMonitorStrategyInterface> {
    const factory = this.factories.find((f) => f.support(documentId, STRATEGY_RESOLVER));
    if (!factory) {
      throw new Error(
        `No ErrorMonitorFactory supports type "${STRATEGY_RESOLVER}". ` +
          `Registered: ${this.factories.length}.`,
      );
    }
    return factory;
  }
}
