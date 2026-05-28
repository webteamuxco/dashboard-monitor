import "server-only";
import { LogMonitorResolver } from "./factory/LogMonitorResolver";
import type { LogMonitorFactoryInterface } from "./factory/LogMonitorFactoryInterface";
import type { LogMonitorStrategyInterface } from "./strategy/LogMonitorStrategyInterface";
import { GlitchTipLogMonitorFactory } from "./adapters/glitchtip/GlitchTipLogMonitorFactory";


const factories: LogMonitorFactoryInterface[] = [
  new GlitchTipLogMonitorFactory(),
];

const resolver = new LogMonitorResolver(factories);

export function getLogMonitor(): LogMonitorStrategyInterface {
  
  const defaultDriver = process.env.NEXT_PUBLIC_LOG_MONITOR_DRIVER;

  const driver = defaultDriver

  if (!driver) {
    throw new Error(
      "NEXT_PUBLIC_LOG_MONITOR_DRIVER env variable is not set. See .env.example.",
    );
  }

  return resolver.resolve(driver);
}
