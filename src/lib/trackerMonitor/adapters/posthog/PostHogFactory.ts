import "server-only";
import type {
  TrackerMonitorFactoryInterface,
} from "../../factory/TrackerMonitorFactoryInterface";
import { AbstractPostHogFactory } from "@/lib/shared/factory/AbstractPosthogFactory";
import { TrackerMonitorStrategyInterface } from "../../strategy/TrackerMonitorStrategyInterface";
import { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { PostHogStrategy } from "@/lib/trackerMonitor/adapters/posthog/PostHogStrategy";

export class PostHogFactory extends AbstractPostHogFactory implements TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface> {

  createStrategy(connection: ToolConnection): PostHogStrategy {

    const client = this.createPostHogClient(connection)

    return new PostHogStrategy(client);
  }
}
