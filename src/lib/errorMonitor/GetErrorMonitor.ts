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

  const defaultDriver = process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER;

  const driver = defaultDriver
  
  if (!driver) {
    throw new Error(
      'NEXT_PUBLIC_ERROR_MONITOR_DRIVER env variable is not set. See .env.example.',
    );
  }
  
  return resolver.resolve(driver);
}
