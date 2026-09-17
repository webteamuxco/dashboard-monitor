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
import { BlockMeasure } from "@/lib/shared/domain/BlockMeasure";
import { resolveMonitorFactory } from "@/lib/shared/factory/MonitorFactoryResolver";


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
    tagId: string | null = null,
  ): Promise<BlockMeasure> => {
    const wiring = await loadToolWiring(kind, documentId);
    const strategy = wiring.strategy;

    if (!strategy) {
      throw new Error(
        `Strapi ${kind} "${documentId}" declares no strategy. Map one in admin.`,
      );
    }

    const factory = resolveMonitorFactory(wiring);
    const connection = factory.createConnection();
    const monitor = factory.createStrategy(connection);

    if (strategy.kind === LOG_MONITOR_STRATEGY_ENUM) {
      return monitor.getBlockMeasures(windowMinutes, environment, limit, tagId)
    }

    return monitor.getBlockMeasures(windowMinutes, environment, limit)
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
