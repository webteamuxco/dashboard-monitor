import "server-only";
import { LogMonitorResolver } from "./factory/LogMonitorResolver";
import type {
  LogMonitorConnection,
  LogMonitorFactoryInterface,
} from "./factory/LogMonitorFactoryInterface";
import type { LogMonitorStrategyInterface } from "./strategy/LogMonitorStrategyInterface";
import { GlitchTipLogMonitorFactory } from "./adapters/glitchtip/GlitchTipLogMonitorFactory";


const factories: LogMonitorFactoryInterface<LogMonitorStrategyInterface>[] = [
  new GlitchTipLogMonitorFactory(),
];

const resolver = new LogMonitorResolver(factories);

export function getLogMonitor(
  documentId: string,
): Promise<LogMonitorFactoryInterface<LogMonitorStrategyInterface>> {
  return resolver.resolve(documentId);
}
