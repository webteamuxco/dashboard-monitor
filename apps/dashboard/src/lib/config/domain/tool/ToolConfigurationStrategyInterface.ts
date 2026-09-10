import { ToolWiring } from "../ToolWiring";
import { ToolConnection } from "./ToolConnection";

export interface ToolConfigurationStrategyInterface {
      resolveConnection(wiring: ToolWiring): ToolConnection;
      isConfigure(
            wiring: ToolWiring,
            strategyName: string
      ): boolean
}
