import "server-only";
import type { TrackerMonitorFactoryInterface } from "../../factory/TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "../../strategy/TrackerMonitorStrategyInterface";
import { PostHogClient } from "@/lib/posthog/PostHogClient";
import { PostHogStrategy } from "./PostHogStrategy";
import { POSTHOG } from "../../TrackerMonitorTypeEnums";

export class PostHogFactory implements TrackerMonitorFactoryInterface {
  support(trackerMonitorType: string): boolean {
    return trackerMonitorType === POSTHOG;
  }

  create(): TrackerMonitorStrategyInterface {
    const baseUrl = process.env.POSTHOG_HOST;
    const token = process.env.POSTHOG_PERSONAL_API_KEY;
    const projectId = process.env.POSTHOG_PROJECT_ID;

    if (!baseUrl || !token || !projectId) {
      throw new Error(
        "PostHog env vars missing: POSTHOG_HOST, POSTHOG_PERSONAL_API_KEY, " +
          "POSTHOG_PROJECT_ID are all required.",
      );
    }

    const client = new PostHogClient({ baseUrl, token, projectId });
    return new PostHogStrategy(client);
  }
}
