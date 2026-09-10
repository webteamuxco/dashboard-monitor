import "server-only";
import { cache } from "react";
import {
  DashboardElementKind,
  loadToolWiring,
} from "@/lib/config/domain/loadToolWiring";
import { getErrorMonitorFactory } from "@/lib/errorMonitor/GetErrorMonitor";
import { getLogMonitor } from "@/lib/logMonitor/GetLogMonitor";
import { getTrackerMonitor } from "@/lib/trackerMonitor/GetTrackerMonitor";
import {
  ERROR_MONITOR_STRATEGY_ENUM,
  LOG_MONITOR_STRATEGY_ENUM,
  TRACKER_MONITOR_STRATEGY_ENUM,
} from "@/lib/shared/strategiesEnum";
import type { Period, PeriodInterval } from "@/lib/shared/domain/Period";
import type { MonitorStrategyTag } from "@/lib/config/domain/MonitorStrategy";
import type { KpiMeasure } from "../domain/KpiMeasure";

const MINUTE_MS = 60_000;

function buildPeriod(windowMinutes: number): Period {
  const now = Date.now();
  // The bucket size does not change the sum, only how many buckets a provider
  // has to return: keep it coarse on wide windows.
  const interval: PeriodInterval = windowMinutes > 120 ? "1h" : "1m";

  return {
    from: new Date(now - windowMinutes * MINUTE_MS).toISOString(),
    to: new Date(now).toISOString(),
    interval,
  };
}

/**
 * The log monitor filters on a single query string, and the environment is a
 * suffix of the tag in this project's log naming (`reservation.sent.production`).
 * Several tags are ANDed, which is how the provider reads space-separated terms.
 */
function buildLogQuery(
  tags: MonitorStrategyTag[],
  environment: string | null,
): string {
  return tags
    .map((tag) => (environment ? `${tag.value}.${environment}` : tag.value))
    .join(" ");
}

const fetchMeasure = cache(
  async (
    kind: DashboardElementKind,
    documentId: string,
    windowMinutes: number | null,
    environment: string | null,
  ): Promise<KpiMeasure> => {
    const wiring = await loadToolWiring(kind, documentId);
    const strategy = wiring.strategy;

    if (!strategy) {
      throw new Error(
        `Strapi ${kind} "${documentId}" declares no strategy. Map one in admin.`,
      );
    }

    const period = windowMinutes === null ? null : buildPeriod(windowMinutes);

    switch (strategy.kind) {
      case ERROR_MONITOR_STRATEGY_ENUM: {
        const factory = getErrorMonitorFactory(wiring);
        const connection = factory.createConnection(wiring);
        const monitor = factory.createStrategy(connection);

        if (!period) {
          // No `limit`: a capped list would make the total plateau at the cap
          // instead of reporting how many issues are actually open.
          const issues = await monitor.getIssues(connection.projectId, {
            resolved: false,
            environment: environment ?? undefined,
          });

          return { value: issues.length, windowMinutes };
        }

        const stats = await monitor.getErrorStats(
          connection.projectId,
          period,
          environment ?? undefined,
        );

        return {
          value: stats.points.reduce(
            (total, point) => total + (point.count ?? 0),
            0,
          ),
          windowMinutes,
        };
      }

      case LOG_MONITOR_STRATEGY_ENUM: {
        if (!strategy.tags.length) {
          throw new Error(
            `Log monitor of Strapi ${kind} "${documentId}" declares no tag: there is nothing to count.`,
          );
        }

        const factory = getLogMonitor(wiring);
        const connection = factory.createConnection(wiring);
        const logs = await factory
          .createStrategy(connection)
          .getLogs(
            connection.projectId,
            { query: buildLogQuery(strategy.tags, environment) },
            period ?? undefined,
          );

        return { value: logs.length, windowMinutes };
      }

      case TRACKER_MONITOR_STRATEGY_ENUM: {
        const factory = getTrackerMonitor(wiring);
        const connection = factory.createConnection(wiring);
        const monitor = factory.createStrategy(connection);

        if (windowMinutes === null) {
          return {
            value: await monitor.getTotalVisitors(connection.projectId),
            windowMinutes,
          };
        }

        const points = await monitor.getActiveUsersTimeline(
          connection.projectId,
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
    }
  },
);

export class KpisDataAccess {
  getMeasure(
    kind: DashboardElementKind,
    documentId: string,
    windowMinutes: number | null,
    environment: string | null = null,
  ): Promise<KpiMeasure> {
    return fetchMeasure(kind, documentId, windowMinutes, environment);
  }
}

export const kpisDataAccess = new KpisDataAccess();
