import "server-only";
import { ErrorMonitorResolver } from "./factory/ErrorMonitorResolver";
import type { ErrorMonitorFactoryInterface } from "./factory/ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "./strategy/ErrorMonitorStrategyInterface";
import { GlitchTipFactory } from "./adapters/glitchtip/GlitchTipErrorMonitorFactory";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

export function getErrorMonitorFactory(
  wiring: ToolWiring
): ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface> {

const factories: ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface>[] = [
  new GlitchTipFactory(wiring),
];

const resolver = new ErrorMonitorResolver(factories);

  return resolver.resolve(wiring);
}
