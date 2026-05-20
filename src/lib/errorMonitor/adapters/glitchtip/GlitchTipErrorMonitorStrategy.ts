import "server-only";
import type { ErrorMonitorStrategyInterface } from "../../strategy/ErrorMonitorStrategyInterface";
import type { Issue, IssueFilters } from "../../domain/Issue";
import type { Period } from "@/lib/shared/domain/Period";
import type { TimeSeriesPoint } from "../../domain/TimeSeriesPoint";
import type { IssueEvent } from "../../domain/IssueEvent";
import type { IssueComment } from "../../domain/IssueComment";
import type { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";
import type { GlitchTipIssueDto } from "./dto/GlitchTipIssue";
import type { GlitchTipStatsV2Dto } from "./dto/GlitchTipStatsV2";
import type { GlitchTipEventDto } from "./dto/GlitchTipEvent";
import type { GlitchTipCommentDto } from "./dto/GlitchTipComment";
import type {
  GlitchTipIssueStatsDto,
  GlitchTipStatsPeriod,
} from "./dto/GlitchTipIssueStats";
import { mapGlitchTipIssue } from "./mappers/IssueMapper";
import { mapGlitchTipStatsV2 } from "./mappers/statsV2Mapper";
import { mapGlitchTipEvent } from "./mappers/EventMapper";
import { mapGlitchTipComment } from "./mappers/CommentMapper";
import { mapGlitchTipIssueStats } from "./mappers/issueStatsMapper";

// GlitchTip's stats_v2 endpoint is a raw ingestion-volume counter: it ignores
// `environment` (as a param and as a `query` token). The issues list, however,
// does honour it — so an environment-scoped series is the sum of the per-issue
// buckets of the issues seen in that environment, read from issues-stats.
// Consequence: the scoping is per issue, not per event. An issue reported from
// two environments contributes all its events to both series.
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
// The list is sorted by lastSeen descending, so the cap only ever drops issues
// older than the ones already counted — never a bucket inside the window.
const ISSUES_SCAN_LIMIT = 200;
// Keeps the repeated `groups` params off the URL-length limit.
const STATS_GROUPS_PER_REQUEST = 50;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function resolveStatsPeriod(spanMs: number): { statsPeriod: GlitchTipStatsPeriod; bucketMs: number } {
  return spanMs <= 24 * HOUR_MS
    ? { statsPeriod: "24h", bucketMs: HOUR_MS }
    : { statsPeriod: "14d", bucketMs: DAY_MS };
}

function buildIssueQuery(filters?: IssueFilters): string {
  const parts: string[] = [];
  if (filters?.resolved === false) parts.push("is:unresolved");
  if (filters?.resolved === true) parts.push("is:resolved");
  if (filters?.level) parts.push(`level:${filters.level}`);
  // An empty query overrides GlitchTip's implicit `is:unresolved` default, so
  // resolved issues show up in the feed unless a status filter is set explicitly.
  return parts.join(" ");
}

function isNotFound(err: unknown): boolean {
  return err instanceof Error && /\b404\b/.test(err.message);
}

export class GlitchTipErrorMonitorStrategy implements ErrorMonitorStrategyInterface {
  constructor(
    private readonly client: GlitchTipClient,
    private readonly organizationSlug: string,
  ) {}

  async getIssues(projectId: string, filters?: IssueFilters): Promise<Issue[]> {
    const dto = await this.client.getPaginated<GlitchTipIssueDto>(
      `/api/0/organizations/${this.organizationSlug}/issues/`,
      {
        project: projectId,
        query: buildIssueQuery(filters),
        limit: filters?.limit,
        environment: filters?.environment,
      },
      { maxItems: filters?.limit },
    );

    return dto.map(mapGlitchTipIssue);
  }

  async getErrorStats(
    projectId: string,
    period: Period,
    environment?: string,
  ): Promise<TimeSeriesPoint[]> {
    if (environment) {
      return this.getErrorStatsForEnvironment(projectId, period, environment);
    }

    const dto = await this.client.get<GlitchTipStatsV2Dto>(
      `/api/0/organizations/${this.organizationSlug}/stats_v2/`,
      {
        category: "error",
        interval: period.interval,
        field: "sum(quantity)",
        project: projectId,
        start: period.from,
        end: period.to,
      },
    );
    return mapGlitchTipStatsV2(dto);
  }

  private async getErrorStatsForEnvironment(
    projectId: string,
    period: Period,
    environment: string,
  ): Promise<TimeSeriesPoint[]> {
    const issues = await this.client.getPaginated<GlitchTipIssueDto>(
      `/api/0/organizations/${this.organizationSlug}/issues/`,
      { project: projectId, environment, query: "" },
      { maxItems: ISSUES_SCAN_LIMIT },
    );

    const fromMs = Date.parse(period.from);
    const toMs = Date.parse(period.to);
    const { statsPeriod, bucketMs } = resolveStatsPeriod(toMs - fromMs);

    const stats: GlitchTipIssueStatsDto[] = [];
    // Sequential on purpose: a burst of concurrent calls is what a self-hosted
    // GlitchTip answers with 500s.
    for (const groups of chunk(issues.map((issue) => issue.id), STATS_GROUPS_PER_REQUEST)) {
      const page = await this.client.get<GlitchTipIssueStatsDto[]>(
        `/api/0/organizations/${this.organizationSlug}/issues-stats/`,
        { groups, statsPeriod },
      );
      stats.push(...page);
    }

    return mapGlitchTipIssueStats(stats, statsPeriod, { fromMs, toMs, bucketMs });
  }

  async getIssue(issueId: string): Promise<Issue> {
    const dto = await this.client.get<GlitchTipIssueDto>(
      `/api/0/issues/${issueId}/`,
    );
    return mapGlitchTipIssue(dto);
  }

  async getIssueLatestEvent(issueId: string): Promise<IssueEvent | null> {
    try {
      const dto = await this.client.get<GlitchTipEventDto>(
        `/api/0/issues/${issueId}/events/latest/`,
      );
      return mapGlitchTipEvent(dto);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async getIssueEvents(issueId: string, limit = 25): Promise<IssueEvent[]> {
    const dto = await this.client.get<GlitchTipEventDto[]>(
      `/api/0/issues/${issueId}/events/`,
      { limit },
    );
    return dto.map(mapGlitchTipEvent);
  }

  async getIssueComments(issueId: string): Promise<IssueComment[]> {
    const dto = await this.client.getPaginated<GlitchTipCommentDto>(
      `/api/0/issues/${issueId}/comments/`,
    );
    return dto.map(mapGlitchTipComment);
  }
}
