import "server-only";
import type {
  TrackerMonitorConnection,
  TrackerMonitorFactoryInterface,
} from "./TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "../strategy/TrackerMonitorStrategyInterface";

export class TrackerMonitorResolver {
  constructor(private readonly factories: TrackerMonitorFactoryInterface[]) {}

  resolve(
    type: string,
    connection: TrackerMonitorConnection,
  ): TrackerMonitorStrategyInterface {
    const factory = this.factories.find((f) => f.support(type));
    if (!factory) {
      throw new Error(
        `No TrackerMonitorFactory supports type "${type}". ` +
          `Registered: ${this.factories.length}.`,
      );
    }
    return factory.create(connection);
  }
}
