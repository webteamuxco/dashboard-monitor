
import "server-only";
import { cache } from "react";
import { StrapiClientFactory } from "@/lib/config/domain/StrapiClientFactory";
import { ToolConfigurationStrategyInterface } from "./ToolConfigurationStrategyInterface";
import { ToolConnection } from "./ToolConnection";

export type PosthogConfiguration = {
    kind: "posthog";
    id: string;
    url: string;
    projectId: string;
};

export class PosthogConfigurationStrategy implements ToolConfigurationStrategyInterface {

    isConfigure = cache(
        async (
            documentId: string,
            strategyName: string, 
            toolSlug: string
        ): Promise<boolean> => {
            return await new StrapiClientFactory().create().isPanelHasStrategy(documentId, strategyName, toolSlug);
        }
    )

    /**
     * Resolves the PostHog connection (instance URL, project id) from the Strapi
     * project's `tool_configuration`. The API key stays in env — only the
     * non-secret connection details live in Strapi.
     */
    resolveConnection = cache(
        async (documentId: string): Promise<ToolConnection> => {
            const panel = await new StrapiClientFactory().create().getPanelById(documentId);
            if (!panel) {
            throw new Error(`Strapi project "${documentId}" not found.`);
            }

            const posthog = panel.toolConfigurations?.find(
                (configuration) => configuration.kind === "posthog",
            );

            if (!posthog) {
                throw new Error(
                    `Strapi panel "${documentId}" has no PostHog configuration.`,
                );
            }

            if (!posthog.url || !posthog.projectId) {
            throw new Error(
                `PostHog configuration of Strapi panel "${documentId}" is incomplete ` +
                "(url and projectId are both required).",
            );
            }

            return {
            baseUrl: posthog.url,
            projectId: posthog.projectId,
            };
        },
    );
}