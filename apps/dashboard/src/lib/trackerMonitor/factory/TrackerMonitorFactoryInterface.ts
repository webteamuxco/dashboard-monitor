import type { TrackerMonitorStrategyInterface } from "../strategy/TrackerMonitorStrategyInterface";

export interface TrackerMonitorFactoryInterface {
  support(trackerMonitorType: string): boolean;
  create(): TrackerMonitorStrategyInterface;
}
