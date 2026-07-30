import "server-only";
import type {
  ErrorMonitorConnection,
  ErrorMonitorFactoryInterface,
} from "./ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "../strategy/ErrorMonitorStrategyInterface";

const TOOL_RESOLVER = "glitchtip"
const STRATEGY_RESOLVER = "error-monitor"

export class ErrorMonitorResolver {

  constructor(private readonly factories: ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>[]) {}

  resolve(
    documentId: string,
  ): ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface> {
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
