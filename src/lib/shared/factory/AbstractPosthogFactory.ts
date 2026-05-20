import "server-only";

import { PostHogClient } from "@/lib/tool/posthog/PostHogClient";

import { PosthogConfigurationStrategy } from "@/lib/config/domain/tool/PosthogConfigurationStrategy";
import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";

const TOOL_RESOLVER = "posthog"

export abstract class AbstractPostHogFactory {

  async support(documentId: string, strategyResolver: string): Promise<boolean> {
    return await new PosthogConfigurationStrategy().isConfigure(documentId, strategyResolver, TOOL_RESOLVER);
  }

  createConnection(documentId: string): Promise<ToolConnection> {
    return new PosthogConfigurationStrategy().resolveConnection(documentId)
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
