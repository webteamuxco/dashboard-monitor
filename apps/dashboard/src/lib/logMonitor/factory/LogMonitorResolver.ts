import "server-only";
import type { LogMonitorFactoryInterface } from "./LogMonitorFactoryInterface";
import type { LogMonitorStrategyInterface } from "../strategy/LogMonitorStrategyInterface";

export class LogMonitorResolver {
  constructor(private readonly factories: LogMonitorFactoryInterface[]) {}

  resolve(type: string): LogMonitorStrategyInterface {
    const factory = this.factories.find((f) => f.support(type));
    if (!factory) {
      throw new Error(
        `No LogMonitorFactory supports type "${type}". ` +
          `Registered: ${this.factories.length}.`,
      );
    }
    return factory.create();
  }
}
