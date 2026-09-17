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
import { BlockListEntry, BlockMeasure } from "@/lib/shared/domain/BlockMeasure";
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
 * The provider ANDs the terms of one query, so a block declaring several tags
 * reads them one at a time. The id comes from the browser: it is matched
 * against the tags the element declares rather than trusted, so nothing the
 * client sends ever reaches the provider query verbatim.
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

    const logs = await this.getLogs(
      this.connection.projectId,
      { query: buildLogQuery(strategy.tags, environment) },
      period ?? undefined,
    );

    return { value: logs.length, windowMinutes };
  }

  async getBlockMeasures(windowMinutes: number | null, environment: string | null, limit: number | null, tagId: string | null): Promise<BlockMeasure> {

    const strategy = this.requireLogStrategy();
    const now = new Date();
    const rows = limit ?? DEFAULT_LIST_LIMIT;

    const tags = selectLogTags(strategy.tags, tagId, this.wiring.id);

    const filters = { query: buildLogQuery(tags, environment) };

    if (windowMinutes === null) {
      const logs = await this.getLogs(this.connection.projectId, filters);

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
    const logs = await this.getLogs(
      this.connection.projectId,
      filters,
      buildBlockPeriod(now, windowMinutes, buckets.interval),
    );

    return {
      type: "series",
      windowMinutes,
      interval: buckets.interval,
      series: [
        {
          key: "count",
          label: strategy.tags.length === 1 ? strategy.tags[0].name : "Occurrences",
          points: aggregateByBucket(
            logs.map((log) => log.timestamp),
            buildEmptyBuckets(now, windowMinutes, buckets.sizeMs),
            buckets.sizeMs,
          ),
        },
      ],
    };
  }
}
