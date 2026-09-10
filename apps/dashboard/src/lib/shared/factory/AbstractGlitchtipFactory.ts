import "server-only";

import { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";

import { GlitchtipConfigurationStrategy, GlitchtipConnection } from "@/lib/config/domain/tool/GlitchtipConfigurationStrategy";
import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

export abstract class AbstractGlitchTipFactory {

  support(wiring: ToolWiring, strategyResolver: string): boolean {
    return new GlitchtipConfigurationStrategy().isConfigure(wiring, strategyResolver);
  }

  createConnection(wiring: ToolWiring): ToolConnection {
    return new GlitchtipConfigurationStrategy().resolveConnection(wiring)
  }

  isGlitchtipConnection(
      connection: ToolConnection
  ): connection is GlitchtipConnection {
    return "baseUrl" in connection && "organizationSlug" in connection;
  }

  createGlithtipClient(connection: ToolConnection): GlitchTipClient {

    const token = process.env.GLITCHTIP_TOKEN;

    if (!token) {
      throw new Error("GlitchTip env var missing: GLITCHTIP_TOKEN is required.");
    }

    const client = new GlitchTipClient({ baseUrl: connection.baseUrl, token });
    return client
  }
}
