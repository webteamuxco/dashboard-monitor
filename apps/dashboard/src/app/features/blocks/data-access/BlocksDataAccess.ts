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
import type { MonitorStrategyTag } from "@/lib/config/domain/MonitorStrategy";
import type { Period, PeriodInterval } from "@/lib/shared/domain/Period";
import type { Issue } from "@/lib/errorMonitor/domain/Issue";
import type { Log } from "@/lib/logMonitor/domain/Log";
import type {
  BlockListEntry,
  BlockMeasure,
  BlockSeriesPoint,
} from "../domain/BlockMeasure";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const DEFAULT_LIST_LIMIT = 20;
const DISPLAY_TIMEZONE = "Europe/Paris";

const hourLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: DISPLAY_TIMEZONE,
});

const minuteLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: DISPLAY_TIMEZONE,
});

const dayLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: DISPLAY_TIMEZONE,
});

const relativeFormatter = new Intl.RelativeTimeFormat("fr", {
  numeric: "auto",
});

interface Buckets {
  interval: PeriodInterval;
  sizeMs: number;
}

const INTERVAL_SIZE_MS: Record<PeriodInterval, number> = {
  "1m": MINUTE_MS,
  "5m": 5 * MINUTE_MS,
  "15m": 15 * MINUTE_MS,
  "1h": HOUR_MS,
  "1d": DAY_MS,
};

// Same threshold as the KPI measure, so a rate block and an interval KPI on
// one panel agree on their buckets.
function resolveBuckets(windowMinutes: number): Buckets {
  return windowMinutes > 120
    ? { interval: "1h", sizeMs: HOUR_MS }
    : { interval: "1m", sizeMs: MINUTE_MS };
}

function buildPeriod(
  now: Date,
  windowMinutes: number,
  interval: PeriodInterval,
): Period {
  return {
    from: new Date(now.getTime() - windowMinutes * MINUTE_MS).toISOString(),
    to: now.toISOString(),
    interval,
  };
}

function formatBucketLabel(date: Date, sizeMs: number): string {
  if (sizeMs < HOUR_MS) {
    return minuteLabelFormatter.format(date);
  }

  if (sizeMs >= DAY_MS) {
    return dayLabelFormatter.format(date);
  }

  const hourPart =
    hourLabelFormatter.formatToParts(date).find((p) => p.type === "hour")
      ?.value ?? "00";

  return `${hourPart}h`;
}

function formatRelative(iso: string, now: Date = new Date()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return relativeFormatter.format(diffSec, "second");
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSec / 3600), "hour");
  return relativeFormatter.format(Math.round(diffSec / 86400), "day");
}

function toPoint(date: Date, count: number | null, sizeMs: number): BlockSeriesPoint {
  return {
    bucketEpoch: date.getTime(),
    label: formatBucketLabel(date, sizeMs),
    count,
  };
}

/**
 * A provider that returns nothing for a quiet bucket would otherwise leave a
 * gap the chart draws as a straight line between two distant points.
 */
function buildEmptyBuckets(
  now: Date,
  windowMinutes: number,
  sizeMs: number,
): BlockSeriesPoint[] {
  const count = Math.max(1, Math.ceil((windowMinutes * MINUTE_MS) / sizeMs));
  const lastBucket = Math.floor(now.getTime() / sizeMs);

  return Array.from({ length: count }, (_, i) =>
    toPoint(new Date((lastBucket - count + 1 + i) * sizeMs), 0, sizeMs),
  );
}

function aggregateByBucket(
  timestamps: string[],
  buckets: BlockSeriesPoint[],
  sizeMs: number,
): BlockSeriesPoint[] {
  const indexByEpoch = new Map(buckets.map((p, i) => [p.bucketEpoch, i]));
  const counts = buckets.map(() => 0);

  for (const timestamp of timestamps) {
    const epoch = Math.floor(new Date(timestamp).getTime() / sizeMs) * sizeMs;
    const index = indexByEpoch.get(epoch);
    if (index !== undefined) counts[index]++;
  }

  return buckets.map((p, i) => ({ ...p, count: counts[i] }));
}

function toIssueEntry(issue: Issue): BlockListEntry {
  return {
    id: issue.id,
    title: issue.title,
    subtitle: issue.type,
    level: issue.level,
    count: issue.eventCount,
    timestampIso: issue.lastSeen,
    timestampLabel: formatRelative(issue.lastSeen),
  };
}

function toLogEntry(log: Log): BlockListEntry {
  return {
    id: log.id,
    title: log.message,
    subtitle: null,
    level: log.level,
    count: null,
    timestampIso: log.timestamp,
    timestampLabel: formatRelative(log.timestamp),
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

/**
 * The provider ANDs the terms of one query, so a block declaring several tags
 * reads them one at a time. The id comes from the browser: it is matched
 * against the tags the element declares rather than trusted, so nothing the
 * client sends ever reaches the provider query verbatim.
 */
function selectLogTags(
  tags: MonitorStrategyTag[],
  tagId: string | null,
  kind: DashboardElementKind,
  documentId: string,
): MonitorStrategyTag[] {
  if (tagId === null) {
    return tags;
  }

  const tag = tags.find((candidate) => candidate.id === tagId);

  if (!tag) {
    throw new Error(
      `Log monitor of Strapi ${kind} "${documentId}" declares no tag "${tagId}".`,
    );
  }

  return [tag];
}

const fetchMeasure = cache(
  async (
    kind: DashboardElementKind,
    documentId: string,
    windowMinutes: number | null,
    environment: string | null,
    limit: number | null,
    tagId: string | null,
  ): Promise<BlockMeasure> => {
    const wiring = await loadToolWiring(kind, documentId);
    const strategy = wiring.strategy;

    if (!strategy) {
      throw new Error(
        `Strapi ${kind} "${documentId}" declares no strategy. Map one in admin.`,
      );
    }

    const now = new Date();
    const rows = limit ?? DEFAULT_LIST_LIMIT;

    switch (strategy.kind) {
      case ERROR_MONITOR_STRATEGY_ENUM: {
        const factory = getErrorMonitorFactory(wiring);
        const connection = factory.createConnection(wiring);
        const monitor = factory.createStrategy(connection);

        if (windowMinutes === null) {
          const issues = await monitor.getIssues(connection.projectId, {
            limit: rows,
            environment: environment ?? undefined,
          });

          return {
            type: "list",
            entries: issues.map(toIssueEntry),
            hasDetail: true,
            windowMinutes,
          };
        }

        const buckets = resolveBuckets(windowMinutes);
        const stats = await monitor.getErrorStats(
          connection.projectId,
          buildPeriod(now, windowMinutes, buckets.interval),
          environment ?? undefined,
        );
        // The provider may serve coarser buckets than the window asked for, so
        // the labels follow what came back rather than what was requested.
        const servedSizeMs = INTERVAL_SIZE_MS[stats.interval];

        return {
          type: "series",
          windowMinutes,
          interval: stats.interval,
          series: [
            {
              key: "count",
              label: "Erreurs",
              points: stats.points.map((p) =>
                toPoint(new Date(p.timestamp), p.count, servedSizeMs),
              ),
            },
          ],
        };
      }

      case LOG_MONITOR_STRATEGY_ENUM: {
        if (!strategy.tags.length) {
          throw new Error(
            `Log monitor of Strapi ${kind} "${documentId}" declares no tag: there is nothing to read.`,
          );
        }

        const tags = selectLogTags(strategy.tags, tagId, kind, documentId);
        const factory = getLogMonitor(wiring);
        const connection = factory.createConnection(wiring);
        const monitor = factory.createStrategy(connection);
        const filters = { query: buildLogQuery(tags, environment) };

        if (windowMinutes === null) {
          const logs = await monitor.getLogs(connection.projectId, filters);

          return {
            type: "list",
            entries: logs
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime(),
              )
              .slice(0, rows)
              .map(toLogEntry),
            hasDetail: false,
            windowMinutes,
          };
        }

        const buckets = resolveBuckets(windowMinutes);
        const logs = await monitor.getLogs(
          connection.projectId,
          filters,
          buildPeriod(now, windowMinutes, buckets.interval),
        );

        return {
          type: "series",
          windowMinutes,
          interval: buckets.interval,
          series: [
            {
              key: "count",
              label: tags.length === 1 ? tags[0].name : "Occurrences",
              points: aggregateByBucket(
                logs.map((log) => log.timestamp),
                buildEmptyBuckets(now, windowMinutes, buckets.sizeMs),
                buckets.sizeMs,
              ),
            },
          ],
        };
      }

      case TRACKER_MONITOR_STRATEGY_ENUM: {
        if (windowMinutes === null) {
          throw new Error(
            `Strapi ${kind} "${documentId}" asks a list from a tracker monitor, which exposes no rows. Use a "rate", "bar" or "stackedBar" block.`,
          );
        }

        const factory = getTrackerMonitor(wiring);
        const connection = factory.createConnection(wiring);
        const monitor = factory.createStrategy(connection);
        const points = await monitor.getActiveUsersTimeline(
          connection.projectId,
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
  },
);

export class BlocksDataAccess {
  getMeasure(
    kind: DashboardElementKind,
    documentId: string,
    windowMinutes: number | null,
    environment: string | null = null,
    limit: number | null = null,
    tagId: string | null = null,
  ): Promise<BlockMeasure> {
    return fetchMeasure(
      kind,
      documentId,
      windowMinutes,
      environment,
      limit,
      tagId,
    );
  }
}

export const blocksDataAccess = new BlocksDataAccess();
