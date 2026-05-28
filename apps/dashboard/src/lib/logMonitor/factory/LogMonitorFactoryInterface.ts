import type { LogMonitorStrategyInterface } from "../strategy/LogMonitorStrategyInterface";

export interface LogMonitorFactoryInterface {
  support(logMonitorType: string): boolean;
  create(): LogMonitorStrategyInterface;
}
