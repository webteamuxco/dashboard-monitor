import "server-only";
import { TrackerMonitorResolver } from "./factory/TrackerMonitorResolver";
import type { TrackerMonitorFactoryInterface } from "./factory/TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "./strategy/TrackerMonitorStrategyInterface";
import { PostHogFactory } from "./adapters/posthog/PostHogFactory";

const factories: TrackerMonitorFactoryInterface[] = [
  new PostHogFactory(),
];

const resolver = new TrackerMonitorResolver(factories);

export function getTrackerMonitor(): TrackerMonitorStrategyInterface {
  const driver = process.env.NEXT_PUBLIC_TRACKER_MONITOR_DRIVER;

  if (!driver) {
    throw new Error(
      "NEXT_PUBLIC_TRACKER_MONITOR_DRIVER env variable is not set. See .env.example.",
    );
  }

  return resolver.resolve(driver);
}
