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

function buildIssueQuery(filters?: IssueFilters): string | undefined {
  if (!filters) return undefined;
  const parts: string[] = [];
  if (filters.resolved === false) parts.push("is:unresolved");
  if (filters.resolved === true) parts.push("is:resolved");
  if (filters.level) parts.push(`level:${filters.level}`);
  return parts.length ? parts.join(" ") : undefined;
}

function isNotFound(err: unknown): boolean {
  return err instanceof Error && /\b404\b/.test(err.message);
}

export class GlitchTipStrategy implements ErrorMonitorStrategyInterface {
  constructor(
    private readonly client: GlitchTipClient,
    private readonly organizationSlug: string,
  ) {}

  async getIssues(projectId: string, filters?: IssueFilters): Promise<Issue[]> {
    const dto = await this.client.get<GlitchTipIssueDto[]>(
      `/api/0/organizations/${this.organizationSlug}/issues/`,
      {
        project: projectId,
        query: buildIssueQuery(filters),
        limit: filters?.limit,
      },
    );
    return dto.map(mapGlitchTipIssue);
  }

  async getErrorStats(projectId: string, period: Period): Promise<TimeSeriesPoint[]> {
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
    const dto = await this.client.get<GlitchTipCommentDto[]>(
      `/api/0/issues/${issueId}/comments/`,
    );
    return dto.map(mapGlitchTipComment);
  }
}
