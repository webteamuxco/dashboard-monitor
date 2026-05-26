import "server-only";
import type { ErrorMonitorStrategyInterface } from "../../strategy/ErrorMonitorStrategyInterface";
import type { Issue, IssueFilters } from "../../domain/Issue";
import type { Period } from "@/lib/shared/domain/Period";
import type { TimeSeriesPoint } from "../../domain/TimeSeriesPoint";
import type { GlitchTipClient } from "@/lib/glitchtip/GlitchTipClient";
import type { GlitchTipIssueDto } from "./dto/GlitchTipIssue";
import type { GlitchTipStatsV2Dto } from "./dto/GlitchTipStatsV2";
import { mapGlitchTipIssue } from "./mappers/IssueMapper";
import { mapGlitchTipStatsV2 } from "./mappers/statsV2Mapper";

function buildIssueQuery(filters?: IssueFilters): string | undefined {
  if (!filters) return undefined;
  const parts: string[] = [];
  if (filters.resolved === false) parts.push("is:unresolved");
  if (filters.resolved === true) parts.push("is:resolved");
  if (filters.level) parts.push(`level:${filters.level}`);
  return parts.length ? parts.join(" ") : undefined;
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
}
