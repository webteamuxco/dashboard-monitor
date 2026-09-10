import "server-only";

import { PostHogClient } from "@/lib/tool/posthog/PostHogClient";

import { PosthogConfigurationStrategy } from "@/lib/config/domain/tool/PosthogConfigurationStrategy";
import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";

export abstract class AbstractPostHogFactory {

  support(wiring: ToolWiring, strategyResolver: string): boolean {
    return new PosthogConfigurationStrategy().isConfigure(wiring, strategyResolver);
  }

  createConnection(wiring: ToolWiring): ToolConnection {
    return new PosthogConfigurationStrategy().resolveConnection(wiring)
  }

  createPostHogClient(connection: ToolConnection): PostHogClient {

    const token = process.env.POSTHOG_PERSONAL_API_KEY;

    if (!token) {
      throw new Error("PostHog env var missing: POSTHOG_PERSONAL_API_KEY is required.");
    }

    const client = new PostHogClient({
      baseUrl: connection.baseUrl,
      token,
      projectId: connection.projectId,
    });
    return client
  }
}
