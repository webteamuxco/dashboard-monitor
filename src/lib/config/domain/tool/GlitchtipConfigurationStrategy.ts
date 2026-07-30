
import "server-only";
import { cache } from "react";
import { StrapiClientFactory } from "@/lib/config/domain/StrapiClientFactory";
import { ToolConfigurationStrategyInterface } from "./ToolConfigurationStrategyInterface";
import { ToolConnection } from "./ToolConnection";

export type GlitchtipConfiguration = {
    kind: "glitchtip";
    id: string;
    url: string;
    projectId: string;
    organization: string;
    toolName: string;
};

export interface GlitchtipConnection extends ToolConnection {
  organizationSlug: string;
}


export class GlitchtipConfigurationStrategy implements ToolConfigurationStrategyInterface {

    isConfigure = cache(
        async (
            documentId: string,
            strategyName: string, 
            toolSlug: string
        ): Promise<boolean> => {
            return await new StrapiClientFactory().create().isProjectHasStrategy(documentId, strategyName, toolSlug);
        }
    )

  /**
   * Resolves the GlitchTip connection (instance URL, organization, project id)
   * from the Strapi project's `tool_configuration`. The API token stays in env —
   * only the non-secret connection details live in Strapi.
   */
  resolveConnection = cache(
    async (documentId: string): Promise<GlitchtipConnection> => {
      const project = await new StrapiClientFactory().create().getProjectById(documentId);
      
      if (!project) {
        throw new Error(`Strapi project "${documentId}" not found.`);
      }

      const glitchtip = project.toolConfigurations.find(
        (configuration) => configuration.kind === "glitchtip",
      );
      if (!glitchtip) {
        throw new Error(
          `Strapi project "${documentId}" has no GlitchTip configuration.`,
        );
      }

      if (!glitchtip.url || !glitchtip.organization || !glitchtip.projectId) {
        throw new Error(
          `GlitchTip configuration of Strapi project "${documentId}" is incomplete ` +
            "(url, organization and projectId are all required).",
        );
      }

      return {
        baseUrl: glitchtip.url,
        organizationSlug: glitchtip.organization,
        projectId: glitchtip.projectId,
      };
    },
  );
}
