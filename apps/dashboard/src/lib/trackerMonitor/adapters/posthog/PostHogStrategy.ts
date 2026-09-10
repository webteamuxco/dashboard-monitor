import "server-only";
import type { TrackerMonitorStrategyInterface } from "../../strategy/TrackerMonitorStrategyInterface";
import type { VisitorsTimeSeriesPoint } from "../../domain/VisitorsTimeSeriesPoint";
import type { PostHogClient } from "@/lib/tool/posthog/PostHogClient";
import type { PostHogQueryResponseDto } from "./dto/PostHogQueryResponse";
import {
  mapPostHogVisitorsTimeline,
  mapPostHogVisitorsTotal,
} from "./mappers/VisitorsTimelineMapper";

const SESSION_DURATION_MINUTES = 30;

function safeWindow(value: number, fallback = 5): number {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export class PostHogStrategy implements TrackerMonitorStrategyInterface {
  constructor(private readonly client: PostHogClient) {}

  async getActiveUsersTimeline(
    _projectId: string,
    windowMinutes: number,
  ): Promise<VisitorsTimeSeriesPoint[]> {
    const win = safeWindow(windowMinutes, 30);
    const hogQl =
      `SELECT toStartOfMinute(e.timestamp) AS minute, ` +
      `uniqExactIf(e.distinct_id, fs.first_ts >= subtractMinutes(e.timestamp, ${SESSION_DURATION_MINUTES})) AS new_visitors, ` +
      `uniqExactIf(e.distinct_id, fs.first_ts < subtractMinutes(e.timestamp, ${SESSION_DURATION_MINUTES})) AS returning_visitors ` +
      `FROM events e ` +
      `INNER JOIN (SELECT distinct_id, min(timestamp) AS first_ts FROM events GROUP BY distinct_id) fs ` +
      `ON fs.distinct_id = e.distinct_id ` +
      `WHERE e.timestamp > subtractMinutes(now(), ${win}) ` +
      `GROUP BY minute ` +
      `ORDER BY minute ASC`;

    const dto = await this.client.query<PostHogQueryResponseDto>(hogQl);

    return mapPostHogVisitorsTimeline(dto, win);
  }

  // The project is baked into the client, so the contract's `projectId` is not
  // read here — hence the shorter signature.
  async getTotalVisitors(): Promise<number> {
    // No time bound on purpose: the KPI asking for this reads a total, so the
    // only horizon is the project's own event retention.
    const hogQl = `SELECT uniqExact(distinct_id) AS visitors FROM events`;

    const dto = await this.client.query<PostHogQueryResponseDto>(hogQl);

    return mapPostHogVisitorsTotal(dto);
  }
}
