import "server-only";
import type {
  ErrorMonitorFactoryInterface,
} from "../../factory/ErrorMonitorFactoryInterface";
import { AbstractGlitchTipFactory } from "@/lib/shared/factory/AbstractGlitchtipFactory";
import { ErrorMonitorStrategyInterface } from "../../strategy/ErrorMonitorStrategyInterface";
import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { GlitchTipErrorMonitorStrategy } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorStrategy";

export class GlitchTipFactory extends AbstractGlitchTipFactory implements ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface> {
  
  createStrategy(connection: ToolConnection): GlitchTipErrorMonitorStrategy { 
    
    if (!this.isGlitchtipConnection(connection)) {
      throw new Error("Expected a GlitchtipConnection.");
    }

    const client = this.createGlithtipClient(connection)
    
    return new GlitchTipErrorMonitorStrategy(client, connection.organizationSlug);
  }
}
