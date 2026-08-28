import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";

export interface FactoryInterface<TStrategy> {
  support(documentId: string, strategyResolver: string): Promise<boolean>;
  createConnection(documentId: string): Promise<ToolConnection>
  createStrategy(connection: ToolConnection): TStrategy;
}