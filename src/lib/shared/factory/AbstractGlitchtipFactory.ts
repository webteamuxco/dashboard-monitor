import "server-only";

import { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";

import { GlitchtipConfigurationStrategy, GlitchtipConnection } from "@/lib/config/domain/tool/GlitchtipConfigurationStrategy";
import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";

const TOOL_RESOLVER = "glitchtip"

export abstract class AbstractGlitchTipFactory {
  
  async support(documentId: string, strategyResolver: string): Promise<boolean> {
    return await new GlitchtipConfigurationStrategy().isConfigure(documentId, strategyResolver, TOOL_RESOLVER);
  }

  createConnection(documentId: string): Promise<ToolConnection> {
    return new GlitchtipConfigurationStrategy().resolveConnection(documentId)
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
