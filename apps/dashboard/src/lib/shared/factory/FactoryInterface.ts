import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

export interface FactoryInterface<TStrategy> {
  support(strategyResolver: string): boolean;
  createConnection(): ToolConnection;
  createStrategy(connection: ToolConnection): TStrategy;
}
