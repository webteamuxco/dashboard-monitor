import "server-only";
import type { ErrorMonitorStrategyInterface } from "../../strategy/ErrorMonitorStrategyInterface";
import type { Issue, IssueFilters } from "../../domain/Issue";
import type { Period } from "@/lib/shared/domain/Period";
import type { TimeSeriesPoint } from "../../domain/TimeSeriesPoint";
import type { IssueEvent } from "../../domain/IssueEvent";
import type { IssueComment } from "../../domain/IssueComment";
import type { GlitchTipClient } from "@/lib/glitchtip/GlitchTipClient";
import type { GlitchTipIssueDto } from "./dto/GlitchTipIssue";
import type { GlitchTipStatsV2Dto } from "./dto/GlitchTipStatsV2";
import type { GlitchTipEventDto } from "./dto/GlitchTipEvent";
import type { GlitchTipCommentDto } from "./dto/GlitchTipComment";
import { mapGlitchTipIssue } from "./mappers/IssueMapper";
import { mapGlitchTipStatsV2 } from "./mappers/statsV2Mapper";
import { mapGlitchTipEvent } from "./mappers/EventMapper";
import { mapGlitchTipComment } from "./mappers/CommentMapper";

// GlitchTip's stats_v2 endpoint is a raw ingestion-volume counter: it ignores
// `environment` (as a param and as a `query` token). To scope the error rate to
// an environment we reconstruct the hourly series from issue events, which carry
// the environment in their `tags`. Bounded to keep the request fan-out sane.
const HOUR_MS = 3_600_000;
const ISSUES_SCAN_LIMIT = 100;
const EVENTS_PER_ISSUE_LIMIT = 100;
const ENVIRONMENT_TAG = "environment";

interface GlitchTipRawEventDto {
  dateCreated?: string | null;
  date_created?: string | null;
  tags?: Array<{ key: string; value: string }> | null;
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

function floorToHour(ms: number): number {
  return Math.floor(ms / HOUR_MS) * HOUR_MS;
}

function buildHourlyBuckets(fromMs: number, toMs: number): Map<number, number> {
  const buckets = new Map<number, number>();
  for (let t = floorToHour(fromMs); t <= toMs; t += HOUR_MS) buckets.set(t, 0);
  return buckets;
}

export class GlitchTipStrategy implements ErrorMonitorStrategyInterface {
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
    const issues = await this.client.get<GlitchTipIssueDto[]>(
      `/api/0/organizations/${this.organizationSlug}/issues/`,
      { project: projectId, environment, limit: ISSUES_SCAN_LIMIT },
    );

    const eventPages = await Promise.all(
      issues.map((issue) =>
        this.client.get<GlitchTipRawEventDto[]>(`/api/0/issues/${issue.id}/events/`, {
          limit: EVENTS_PER_ISSUE_LIMIT,
        }),
      ),
    );

    const fromMs = Date.parse(period.from);
    const toMs = Date.parse(period.to);
    const buckets = buildHourlyBuckets(fromMs, toMs);

    for (const events of eventPages) {
      for (const event of events) {
        const envTag = event.tags?.find((t) => t.key === ENVIRONMENT_TAG)?.value;
        if (envTag !== environment) continue;

        const iso = event.dateCreated ?? event.date_created;
        const at = iso ? Date.parse(iso) : NaN;
        if (Number.isNaN(at) || at < fromMs || at > toMs) continue;

        const hour = floorToHour(at);
        buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
      }
    }

    return Array.from(buckets, ([epoch, count]) => ({
      timestamp: new Date(epoch).toISOString(),
      count,
    }));
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
