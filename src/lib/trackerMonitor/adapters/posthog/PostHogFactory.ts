import "server-only";
import type {
  TrackerMonitorConnection,
  TrackerMonitorFactoryInterface,
} from "../../factory/TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "../../strategy/TrackerMonitorStrategyInterface";
import { PostHogClient } from "@/lib/tool/posthog/PostHogClient";
import { PostHogStrategy } from "./PostHogStrategy";
import { POSTHOG } from "../../TrackerMonitorTypeEnums";

export class PostHogFactory implements TrackerMonitorFactoryInterface {
  support(trackerMonitorType: string): boolean {
    return trackerMonitorType === POSTHOG;
  }

  create(connection: TrackerMonitorConnection): TrackerMonitorStrategyInterface {
    const token = process.env.POSTHOG_PERSONAL_API_KEY;

    if (!token) {
      throw new Error(
        "PostHog env var missing: POSTHOG_PERSONAL_API_KEY is required.",
      );
    }

    const client = new PostHogClient({
      baseUrl: connection.baseUrl,
      token,
      projectId: connection.projectId,
    });
    return new PostHogStrategy(client);
  }
}
