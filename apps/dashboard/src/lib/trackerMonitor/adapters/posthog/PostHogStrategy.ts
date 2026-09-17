import "server-only";
import type { TrackerMonitorStrategyInterface } from "../../strategy/TrackerMonitorStrategyInterface";
import type { VisitorsTimeSeriesPoint } from "../../domain/VisitorsTimeSeriesPoint";
import type { PostHogClient } from "@/lib/tool/posthog/PostHogClient";
import type { PostHogQueryResponseDto } from "./dto/PostHogQueryResponse";
import {
  mapPostHogVisitorsTimeline,
  mapPostHogVisitorsTotal,
} from "./mappers/VisitorsTimelineMapper";
import { KpiMeasure } from "@/lib/shared/domain/KpiMeasure";
import { PosthogConnection } from "@/lib/config/domain/tool/PosthogConfigurationStrategy";
import { BlockMeasure } from "@/lib/shared/domain/BlockMeasure";
import { getTrackerMonitor } from "../../GetTrackerMonitor";
import { MonitorStrategyTag } from "@/lib/config/domain/MonitorStrategy";
import { DashboardElementKind } from "@/lib/config/domain/loadToolWiring";

const SESSION_DURATION_MINUTES = 30;

function safeWindow(value: number, fallback = 5): number {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}


export class PostHogStrategy implements TrackerMonitorStrategyInterface {
  constructor(
    private readonly client: PostHogClient,
    private readonly connection: PosthogConnection,
  ) { }

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

  async getKpiMeasures(windowMinutes: number | null, environment: string | null): Promise<KpiMeasure> {

    if (windowMinutes === null) {
      return {
        value: await this.getTotalVisitors(),
        windowMinutes,
      };
    }

    const points = await this.getActiveUsersTimeline(
      this.connection.projectId,
      windowMinutes,
    );

    return {
      value: points.reduce(
        (total, point) => total + point.newCount + point.returningCount,
        0,
      ),
      windowMinutes,
    };
  }

  async getBlockMeasures(windowMinutes: number | null, environment: string | null, limit: number | null,): Promise<BlockMeasure> {
        
    
    if (windowMinutes === null) {
          throw new Error(
            `Strapi trackerMonitor "${this.connection.projectId}" asks a list from a tracker monitor, which exposes no rows. Use a "rate", "bar" or "stackedBar" block.`,
          );
        }

        const points = await this.getActiveUsersTimeline(
          this.connection.projectId,
          windowMinutes,
        );

        return {
          type: "series",
          windowMinutes,
          interval: "1m",
          series: [
            {
              key: "newCount",
              label: "Nouveaux",
              points: points.map((p) => ({
                bucketEpoch: new Date(p.minuteIso).getTime(),
                label: p.label,
                count: p.newCount,
              })),
            },
            {
              key: "returningCount",
              label: "Récurrents",
              points: points.map((p) => ({
                bucketEpoch: new Date(p.minuteIso).getTime(),
                label: p.label,
                count: p.returningCount,
              })),
            },
          ],
        };
  }
}
