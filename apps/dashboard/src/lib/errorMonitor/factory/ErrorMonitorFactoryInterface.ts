import type { ErrorMonitorStrategyInterface } from "../strategy/ErrorMonitorStrategyInterface";

export interface ErrorMonitorFactoryInterface {
  support(errorMonitorType: string): boolean;
  create(): ErrorMonitorStrategyInterface;
}
