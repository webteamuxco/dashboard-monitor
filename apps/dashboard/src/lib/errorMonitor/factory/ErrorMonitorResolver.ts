import "server-only";
import type { ErrorMonitorFactoryInterface } from "./ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "../strategy/ErrorMonitorStrategyInterface";

export class ErrorMonitorResolver {
  constructor(private readonly factories: ErrorMonitorFactoryInterface[]) {}

  resolve(type: string): ErrorMonitorStrategyInterface {
    const factory = this.factories.find((f) => f.support(type));
    if (!factory) {
      throw new Error(
        `No ErrorMonitorFactory supports type "${type}". ` +
          `Registered: ${this.factories.length}.`,
      );
    }
    return factory.create();
  }
}
