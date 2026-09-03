import "server-only";
import type { ErrorMonitorStrategyInterface } from "../../strategy/ErrorMonitorStrategyInterface";
import type { Issue, IssueFilters } from "../../domain/Issue";
import type { Period } from "@/lib/shared/domain/Period";
import type { TimeSeries } from "../../domain/TimeSeriesPoint";
import type { IssueEvent } from "../../domain/IssueEvent";
import type { IssueComment, NewIssueComment } from "../../domain/IssueComment";
import type { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";
import type { GlitchTipIssueDto } from "./dto/GlitchTipIssue";
import type {
  GlitchTipEventDto,
  GlitchTipLatestEventDto,
  GlitchTipListEventDto,
} from "./dto/GlitchTipEvent";
import type {
  GlitchTipCommentDto,
  GlitchTipCommentPayloadDto,
} from "./dto/GlitchTipComment";
import { mapGlitchTipIssue } from "./mappers/IssueMapper";
import { mapGlitchTipEvent } from "./mappers/EventMapper";
import { mapGlitchTipComment } from "./mappers/CommentMapper";
import { mapGlitchTipEventSeries } from "./mappers/eventSeriesMapper";

// Nothing in GlitchTip aggregates per environment. `stats_v2` ignores the
// filter and counts ingestion volume rather than events attached to issues;
// `issues-stats` ignores it too; and scoping the *issues list* is per group, so
// an issue with a single production event would hand its whole event volume to
// the production series. The one per-event source is each issue's event feed,
// where every event carries its own timestamp and `environment` tag — so both
// the scoped and the unscoped series are built from it, and a total is always
// the sum of its environments.
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
// The list is sorted by lastSeen descending, so the cap only ever drops issues
// older than the ones already counted — never a bucket inside the window.
const ISSUES_SCAN_LIMIT = 200;
// Ceiling on the events read to build one series, across every issue. Reaching
// it marks the series `truncated` instead of quietly under-reporting.
const EVENT_SCAN_BUDGET = 2_000;
// The per-issue event endpoints ignore `environment` — as a param *and* as a
// `query` token, measured against GlitchTip 5.x — so an environment-scoped
// event list is obtained by reading the feed and keeping the events whose
// `environment` tag matches. The feed is sorted by date descending, so the cap
// only ever drops events older than the ones already kept; an issue whose
// recent activity is entirely in another environment can still come back short.
const EVENTS_SCAN_LIMIT = 100;

function eventEnvironment(dto: GlitchTipEventDto): string | undefined {
  return dto.tags?.find((tag) => tag.key === "environment")?.value;
}

function resolveBucketMs(spanMs: number): number {
  return spanMs <= 24 * HOUR_MS ? HOUR_MS : DAY_MS;
}

// The list is ordered by lastSeen descending: if even the oldest issue it
// returned was still active inside the window, the cap hid others that were too.
function hasUnreadActiveIssues(
  issues: GlitchTipIssueDto[],
  fromMs: number,
): boolean {
  const oldest = issues.at(-1);
  return (
    issues.length >= ISSUES_SCAN_LIMIT &&
    !!oldest &&
    Date.parse(oldest.lastSeen) >= fromMs
  );
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
  ): Promise<TimeSeries> {
    const fromMs = Date.parse(period.from);
    const toMs = Date.parse(period.to);

    // Listed without an environment filter on purpose: the filter is per group,
    // so it would both admit issues whose window activity is in another
    // environment and count them in full. The narrowing happens per event.
    const issues = await this.client.getPaginated<GlitchTipIssueDto>(
      `/api/0/organizations/${this.organizationSlug}/issues/`,
      { project: projectId, query: "" },
      { maxItems: ISSUES_SCAN_LIMIT },
    );

    const active = issues.filter((issue) => Date.parse(issue.lastSeen) >= fromMs);

    const events: GlitchTipListEventDto[] = [];
    let budget = EVENT_SCAN_BUDGET;
    let truncated = hasUnreadActiveIssues(issues, fromMs);

    // Sequential on purpose: a burst of concurrent calls is what a self-hosted
    // GlitchTip answers with 500s.
    for (const issue of active) {
      if (budget <= 0) {
        truncated = true;
        break;
      }

      const feed = await this.client.getPaginated<GlitchTipListEventDto>(
        `/api/0/issues/${issue.id}/events/`,
        {},
        {
          maxItems: budget,
          stopWhen: (event) => Date.parse(event.date_created) < fromMs,
        },
      );

      // The walk ended on the budget rather than on an event older than the
      // window, so this issue still had events left to count.
      const oldest = feed.at(-1);
      if (feed.length >= budget && oldest && Date.parse(oldest.date_created) >= fromMs) {
        truncated = true;
      }

      budget -= feed.length;
      events.push(...feed);
    }

    const points = mapGlitchTipEventSeries(
      events,
      { fromMs, toMs, bucketMs: resolveBucketMs(toMs - fromMs) },
      environment,
    );

    return { points, truncated };
  }

  async getIssue(issueId: string): Promise<Issue> {
    const dto = await this.client.get<GlitchTipIssueDto>(
      `/api/0/issues/${issueId}/`,
    );
    return mapGlitchTipIssue(dto);
  }

  async getIssueLatestEvent(
    issueId: string,
    environment?: string,
  ): Promise<IssueEvent | null> {
    // `/events/latest/` is the whole group's latest event, all environments
    // mixed, and it ignores the filter — so a scoped "latest" is the head of
    // the scoped feed.
    if (environment) {
      const [latest] = await this.getIssueEvents(issueId, 1, environment);
      return latest ?? null;
    }

    try {
      const dto = await this.client.get<GlitchTipLatestEventDto>(
        `/api/0/issues/${issueId}/events/latest/`,
      );
      return mapGlitchTipEvent(dto);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async getIssueEvents(
    issueId: string,
    limit = 25,
    environment?: string,
  ): Promise<IssueEvent[]> {
    if (!environment) {
      const dto = await this.client.get<GlitchTipListEventDto[]>(
        `/api/0/issues/${issueId}/events/`,
        { limit },
      );
      return dto.map(mapGlitchTipEvent);
    }

    const dto = await this.client.getPaginated<GlitchTipListEventDto>(
      `/api/0/issues/${issueId}/events/`,
      {},
      { maxItems: EVENTS_SCAN_LIMIT },
    );

    return dto
      .filter((event) => eventEnvironment(event) === environment)
      .slice(0, limit)
      .map(mapGlitchTipEvent);
  }

  async getIssueComments(issueId: string): Promise<IssueComment[]> {
    const dto = await this.client.getPaginated<GlitchTipCommentDto>(
      `/api/0/issues/${issueId}/comments/`,
    );
    return dto.map(mapGlitchTipComment);
  }

  async createIssueComment(
    issueId: string,
    comment: NewIssueComment,
  ): Promise<IssueComment> {
    const payload: GlitchTipCommentPayloadDto = { data: { text: comment.text } };
    const dto = await this.client.post<GlitchTipCommentDto>(
      `/api/0/issues/${issueId}/comments/`,
      payload,
    );
    return mapGlitchTipComment(dto);
  }
}
