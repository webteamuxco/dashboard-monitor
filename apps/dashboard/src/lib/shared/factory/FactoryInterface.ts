import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";

export interface FactoryInterface<TStrategy> {
  support(strategyResolver: string): boolean;
  createConnection(): ToolConnection;
  createStrategy(connection: ToolConnection): TStrategy;
}
