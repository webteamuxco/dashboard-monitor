import "server-only";
import { TrackerMonitorResolver } from "./factory/TrackerMonitorResolver";
import type { TrackerMonitorFactoryInterface } from "./factory/TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "./strategy/TrackerMonitorStrategyInterface";
import { PostHogFactory } from "./adapters/posthog/PostHogFactory";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

const factories: TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface>[] = [
  new PostHogFactory(),
];

const resolver = new TrackerMonitorResolver(factories);

export function getTrackerMonitor(
  wiring: ToolWiring,
): TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface> {
  return resolver.resolve(wiring);
}
