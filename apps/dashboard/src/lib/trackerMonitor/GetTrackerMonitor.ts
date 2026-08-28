import "server-only";
import { TrackerMonitorResolver } from "./factory/TrackerMonitorResolver";
import type { TrackerMonitorFactoryInterface } from "./factory/TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "./strategy/TrackerMonitorStrategyInterface";
import { PostHogFactory } from "./adapters/posthog/PostHogFactory";

const factories: TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface>[] = [
  new PostHogFactory(),
];

const resolver = new TrackerMonitorResolver(factories);

export function getTrackerMonitor(
  documentId: string,
): Promise<TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface>> {
  return resolver.resolve(documentId);
}
