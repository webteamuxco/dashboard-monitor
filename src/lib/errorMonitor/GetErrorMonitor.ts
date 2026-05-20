import "server-only";
import { ErrorMonitorResolver } from "./factory/ErrorMonitorResolver";
import type { ErrorMonitorFactoryInterface } from "./factory/ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "./strategy/ErrorMonitorStrategyInterface";
import { GlitchTipFactory } from "./adapters/glitchtip/GlitchTipErrorMonitorFactory";

const factories: ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>[] = [
  new GlitchTipFactory(),
];

const resolver = new ErrorMonitorResolver(factories);

export function getErrorMonitorFactory(
  documentId: string
): Promise<ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>> {
  return resolver.resolve(documentId);
}
