import "server-only";
import type {
  LogMonitorFactoryInterface,
} from "../../factory/LogMonitorFactoryInterface";
import { AbstractGlitchTipFactory } from "@/lib/shared/factory/AbstractGlitchtipFactory";
import { LogMonitorStrategyInterface } from "../../strategy/LogMonitorStrategyInterface";
import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { GlitchTipLogMonitorStrategy } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorStrategy";

export class GlitchTipLogMonitorFactory extends AbstractGlitchTipFactory implements LogMonitorFactoryInterface<LogMonitorStrategyInterface> {

  createStrategy(connection: ToolConnection): GlitchTipLogMonitorStrategy { 
    
    if (!this.isGlitchtipConnection(connection)) {
      throw new Error("Expected a GlitchtipConnection.");
    }

    const client = this.createGlithtipClient(connection)
    
    return new GlitchTipLogMonitorStrategy(client, connection.organizationSlug);
  }
}
