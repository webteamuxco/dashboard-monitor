import "server-only";
import { LogMonitorResolver } from "./factory/LogMonitorResolver";
import type { LogMonitorFactoryInterface } from "./factory/LogMonitorFactoryInterface";
import type { LogMonitorStrategyInterface } from "./strategy/LogMonitorStrategyInterface";
import { GlitchTipLogMonitorFactory } from "./adapters/glitchtip/GlitchTipLogMonitorFactory";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";


const factories: LogMonitorFactoryInterface<LogMonitorStrategyInterface>[] = [
  new GlitchTipLogMonitorFactory(),
];

const resolver = new LogMonitorResolver(factories);

export function getLogMonitor(
  wiring: ToolWiring,
): LogMonitorFactoryInterface<LogMonitorStrategyInterface> {
  return resolver.resolve(wiring);
}
