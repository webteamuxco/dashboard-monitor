import { ToolConnection } from "./ToolConnection";

export interface ToolConfigurationStrategyInterface {
      resolveConnection(documentId: string): Promise<ToolConnection>;
      isConfigure(
            documentId: string,
            strategyName: string, 
            toolSlug: string
      ): Promise<boolean>
}