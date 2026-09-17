import "server-only";
import { TrackerMonitorResolver } from "./factory/TrackerMonitorResolver";
import type { TrackerMonitorFactoryInterface } from "./factory/TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "./strategy/TrackerMonitorStrategyInterface";
import { PostHogFactory } from "./adapters/posthog/PostHogFactory";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";



export function getTrackerMonitor(
  wiring: ToolWiring,
): TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface> {

  const factories: TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface>[] = [
    new PostHogFactory(wiring),
  ];

  const resolver = new TrackerMonitorResolver(factories);

  return resolver.resolve(wiring);
}
