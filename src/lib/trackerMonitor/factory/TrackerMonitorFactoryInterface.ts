import type { TrackerMonitorStrategyInterface } from "../strategy/TrackerMonitorStrategyInterface";

export interface TrackerMonitorConnection {
  baseUrl: string;
  projectId: string;
}

export interface TrackerMonitorFactoryInterface {
  support(trackerMonitorType: string): boolean;
  create(connection: TrackerMonitorConnection): TrackerMonitorStrategyInterface;
}
