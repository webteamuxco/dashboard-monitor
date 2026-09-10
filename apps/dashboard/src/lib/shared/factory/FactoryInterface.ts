import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

export interface FactoryInterface<TStrategy> {
  support(wiring: ToolWiring, strategyResolver: string): boolean;
  createConnection(wiring: ToolWiring): ToolConnection;
  createStrategy(connection: ToolConnection): TStrategy;
}
