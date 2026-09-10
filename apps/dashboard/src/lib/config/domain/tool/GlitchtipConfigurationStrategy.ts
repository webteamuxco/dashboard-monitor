import "server-only";
import { ToolConfigurationStrategyInterface } from "./ToolConfigurationStrategyInterface";
import { ToolConnection } from "./ToolConnection";
import { ToolWiring } from "../ToolWiring";

const TOOL_KIND = "glitchtip";

export type GlitchtipConfiguration = {
    kind: typeof TOOL_KIND;
    id: string;
    url: string;
    projectId: string;
    organization: string | null;
};

export interface GlitchtipConnection extends ToolConnection {
  organizationSlug: string;
}

export class GlitchtipConfigurationStrategy implements ToolConfigurationStrategyInterface {

    /**
     * A dashboard element carries both its strategy and its tool, so supporting
     * it is one question about one document: does it ask for this strategy,
     * through this vendor?
     */
    isConfigure(wiring: ToolWiring, strategyName: string): boolean {
        return (
            wiring.strategy?.kind === strategyName &&
            wiring.configuration?.kind === TOOL_KIND
        );
    }

  /**
   * Shapes the GlitchTip connection (instance URL, organization, project id)
   * out of the element's tool configuration. The API token stays in env — only
   * the non-secret connection details live in Strapi.
   */
  resolveConnection(wiring: ToolWiring): GlitchtipConnection {
      const glitchtip = wiring.configuration;

      if (glitchtip?.kind !== TOOL_KIND) {
        throw new Error(
          `Strapi element "${wiring.id}" has no GlitchTip configuration.`,
        );
      }

      if (!glitchtip.url || !glitchtip.organization || !glitchtip.projectId) {
        throw new Error(
          `GlitchTip configuration of Strapi element "${wiring.id}" is incomplete ` +
            "(url, organization and projectId are all required).",
        );
      }

      return {
        baseUrl: glitchtip.url,
        organizationSlug: glitchtip.organization,
        projectId: glitchtip.projectId,
      };
  }
}
