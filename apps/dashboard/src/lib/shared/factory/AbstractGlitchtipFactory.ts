import "server-only";

import { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";

import { GlitchtipConfigurationStrategy, GlitchtipConnection } from "@/lib/config/domain/tool/GlitchtipConfigurationStrategy";
import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

export abstract class AbstractGlitchTipFactory {

  constructor(
    protected readonly wiring: ToolWiring,
  ) {}

  support(strategyResolver: string): boolean {
    return new GlitchtipConfigurationStrategy().isConfigure(this.wiring, strategyResolver);
  }

  createConnection(): ToolConnection {
    return new GlitchtipConfigurationStrategy().resolveConnection(this.wiring)
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
