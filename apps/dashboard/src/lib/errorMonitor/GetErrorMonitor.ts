import "server-only";
import { ErrorMonitorResolver } from "./factory/ErrorMonitorResolver";
import type { ErrorMonitorFactoryInterface } from "./factory/ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "./strategy/ErrorMonitorStrategyInterface";
import { GlitchTipFactory } from "./adapters/glitchtip/GlitchTipErrorMonitorFactory";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

const factories: ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>[] = [
  new GlitchTipFactory(),
];

const resolver = new ErrorMonitorResolver(factories);

export function getErrorMonitorFactory(
  wiring: ToolWiring
): ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface> {
  return resolver.resolve(wiring);
}
