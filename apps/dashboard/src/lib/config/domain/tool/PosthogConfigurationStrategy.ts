import "server-only";
import { ToolConfigurationStrategyInterface } from "./ToolConfigurationStrategyInterface";
import { ToolConnection } from "./ToolConnection";
import { ToolWiring } from "../ToolWiring";

const TOOL_KIND = "posthog";

export type PosthogConfiguration = {
    kind: typeof TOOL_KIND;
    id: string;
    url: string;
    projectId: string;
};

export class PosthogConfigurationStrategy implements ToolConfigurationStrategyInterface {

    isConfigure(wiring: ToolWiring, strategyName: string): boolean {
        return (
            wiring.strategy?.kind === strategyName &&
            wiring.configuration?.kind === TOOL_KIND
        );
    }

    /**
     * Shapes the PostHog connection (instance URL, project id) out of the
     * element's tool configuration. The API key stays in env — only the
     * non-secret connection details live in Strapi.
     */
    resolveConnection(wiring: ToolWiring): ToolConnection {
        const posthog = wiring.configuration;

        if (posthog?.kind !== TOOL_KIND) {
            throw new Error(
                `Strapi element "${wiring.id}" has no PostHog configuration.`,
            );
        }

        if (!posthog.url || !posthog.projectId) {
            throw new Error(
                `PostHog configuration of Strapi element "${wiring.id}" is incomplete ` +
                    "(url and projectId are both required).",
            );
        }

        return {
            baseUrl: posthog.url,
            projectId: posthog.projectId,
        };
    }
}
