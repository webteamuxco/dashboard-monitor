import "server-only";
import type { TrackerMonitorFactoryInterface } from "./TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "../strategy/TrackerMonitorStrategyInterface";

export class TrackerMonitorResolver {
  constructor(private readonly factories: TrackerMonitorFactoryInterface[]) {}

  resolve(type: string): TrackerMonitorStrategyInterface {
    const factory = this.factories.find((f) => f.support(type));
    if (!factory) {
      throw new Error(
        `No TrackerMonitorFactory supports type "${type}". ` +
          `Registered: ${this.factories.length}.`,
      );
    }
    return factory.create();
  }
}
