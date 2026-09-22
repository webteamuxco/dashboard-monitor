import "server-only";
import type { LogMonitorStrategyInterface } from "../../strategy/LogMonitorStrategyInterface";
import type { Log, LogFilters } from "../../domain/Log";
import type { Period } from "@/lib/shared/domain/Period";
import type { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";
import type { GlitchTipLogDto } from "./dto/GlitchTipLogs";
import { mapGlitchTipLog } from "./mappers/logsMapper";
import { GlitchtipConnection } from "@/lib/config/domain/tool/GlitchtipConfigurationStrategy";
import { buildLogQuery } from "@/lib/utils";
import { ToolWiring } from "@/lib/config/domain/ToolWiring";
import { LOG_MONITOR_STRATEGY_ENUM } from "@/lib/shared/strategiesEnum";
import { aggregateByBucket, buildBlockPeriod, buildEmptyBuckets, buildKpiPeriod, DEFAULT_LIST_LIMIT, formatRelative, resolveBuckets } from "@/lib/shared/helper/periodHelper";
import { BlockListEntry, BlockMeasure, BlockMeasureOptions } from "@/lib/shared/domain/BlockMeasure";
import { LogMonitorStrategy, MonitorStrategyTag } from "@/lib/config/domain/MonitorStrategy";
import { KpiMeasure } from "@/lib/shared/domain/KpiMeasure";



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
 * The id comes from the browser: it is matched against the tags the element
 * declares rather than trusted, so nothing the client sends ever reaches the
 * provider query verbatim. No id means every tag, which a stacked bar draws as
 * one series each.
 */
function selectLogTags(
  tags: MonitorStrategyTag[],
  tagId: string | null,
  elementId: string,
): MonitorStrategyTag[] {
  if (tagId === null) {
    return tags;
  }

  const tag = tags.find((candidate) => candidate.id === tagId);

  if (!tag) {
    throw new Error(
      `Log monitor of Strapi element "${elementId}" declares no tag "${tagId}".`,
    );
  }

  return [tag];
}

export class GlitchTipLogMonitorStrategy implements LogMonitorStrategyInterface {

  constructor(
    private readonly client: GlitchTipClient,
    private readonly connection: GlitchtipConnection,
    private readonly wiring: ToolWiring,
  ) {
  }

  async getLogs(projectId: string, filters?: LogFilters, period?: Period): Promise<Log[]> {
    const dto = await this.client.getPaginated<GlitchTipLogDto>(
      `/api/0/organizations/${this.connection.organizationSlug}/logs/`,
      {
        project: projectId,
        start: period?.from,
        end: period?.to,
        query: filters?.query,
        service: filters?.service,
        environment: filters?.environment
      },
    );
    return dto.map(mapGlitchTipLog);
  }

  /**
   * Everything a log measure needs from the element, validated in one place so
   * a KPI and a block refuse the same wirings. Keeping the checks per method is
   * how a block came to count the whole project while a KPI refused to.
   */
  private requireLogStrategy(): LogMonitorStrategy {
    const strategy = this.wiring.strategy;

    if (!strategy) {
      throw new Error(
        `Strapi LogMonitor "${this.wiring.configuration?.projectId}" declares no strategy. Map one in admin.`,
      );
    }

    if (strategy.kind !== LOG_MONITOR_STRATEGY_ENUM) {
      throw new Error(
        `Expected a LogMonitor strategy, got "${strategy.kind}".`,
      );
    }

    // An empty tag list builds an empty query, which the provider reads as
    // "everything": the card would report the project's whole log volume as if
    // it were the measure asked for.
    if (!strategy.tags.length) {
      throw new Error(
        `Log monitor of Strapi element "${this.wiring.id}" declares no tag: there is nothing to count.`,
      );
    }

    return strategy;
  }

  async getKpiMeasures(windowMinutes: number | null, environment: string | null): Promise<KpiMeasure> {

    const strategy = this.requireLogStrategy();

    const period = windowMinutes === null ? null : buildKpiPeriod(windowMinutes);

    const logsPerTag = await this.getLogsPerTag(
      strategy.tags,
      environment ?? undefined,
      period ?? undefined,
    );

    const value = logsPerTag.reduce((sum, logs) => sum + logs.length, 0);

    if (strategy.tags.length < 2) {
      return { value, windowMinutes };
    }

    return {
      value,
      windowMinutes,
      breakdown: strategy.tags.map((tag, index) => ({
        key: tag.id,
        label: tag.description ?? tag.name,
        value: logsPerTag[index].length,
        color: tag.color,
      })),
    };
  }

  async getBlockMeasures(windowMinutes: number | null, environment: string | null, limit: number | null, options?: BlockMeasureOptions): Promise<BlockMeasure> {

    const tagId = options?.tagId ?? null;
    const strategy = this.requireLogStrategy();
    const now = new Date();
    const rows = limit ?? DEFAULT_LIST_LIMIT;

    const tags = selectLogTags(strategy.tags, tagId, this.wiring.id);

    if (windowMinutes === null) {
      const logs = (
        await this.getLogsPerTag(tags, environment ?? undefined)
      ).flat();

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
    const logsPerTag = await this.getLogsPerTag(
      tags,
      environment ?? undefined,
      buildBlockPeriod(now, windowMinutes, buckets.interval),
    );
    const emptyBuckets = buildEmptyBuckets(now, windowMinutes, buckets.sizeMs);

    return {
      type: "series",
      windowMinutes,
      interval: buckets.interval,
      series: tags.map((tag, index) => ({
        key: tag.id,
        label: tag.name,
        color: tag.color,
        points: aggregateByBucket(
          logsPerTag[index].map((log) => log.timestamp),
          emptyBuckets,
          buckets.sizeMs,
        ),
      })),
    };
  }

  /**
   * The provider ANDs the terms of one query, so tags are never joined: each
   * one is a query of its own, and the calls run together.
   */
  private getLogsPerTag(
    tags: MonitorStrategyTag[],
    environment: string | undefined,
    period?: Period,
  ): Promise<Log[][]> {
    return Promise.all(
      tags.map((tag) =>
        this.getLogs(
          this.connection.projectId,
          { service: buildLogQuery([tag]), environment },
          period,
        ),
      ),
    );
  }
}
