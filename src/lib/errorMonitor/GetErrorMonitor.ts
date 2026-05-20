import "server-only";
import { ErrorMonitorResolver } from "./factory/ErrorMonitorResolver";
import type { ErrorMonitorFactoryInterface } from "./factory/ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "./strategy/ErrorMonitorStrategyInterface";
import { GlitchTipFactory } from "./adapters/glitchtip/GlitchTipFactory";

const factories: ErrorMonitorFactoryInterface[] = [
  new GlitchTipFactory(),
];

const resolver = new ErrorMonitorResolver(factories);

export function getErrorMonitor(): ErrorMonitorStrategyInterface {

  const driver = process.env.ERROR_MONITOR_DRIVER;

  if (!driver) {
    throw new Error(
      'ERROR_MONITOR_DRIVER env variable is not set. See .env.example.',
    );
  }
  
  return resolver.resolve(driver);
}
