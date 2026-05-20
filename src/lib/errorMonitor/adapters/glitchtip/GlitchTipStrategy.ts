import "server-only";
import type { ErrorMonitorStrategyInterface } from "../../strategy/ErrorMonitorStrategyInterface";
import type { Issue, IssueFilters } from "../../domain/Issue";
import type { Log, LogFilters } from "../../domain/Log";
import type { Period } from "../../domain/Period";
import type { GlitchTipClient } from "./GlitchTipClient";
import type { GlitchTipIssueDto } from "./dto/GlitchTipIssue";
import type { GlitchTipLogDto } from "./dto/GlitchTipLogs";
import { mapGlitchTipIssue } from "./mappers/IssueMapper";
import { mapGlitchTipLog } from "./mappers/logsMapper";

const RESERVATION_TAG = "reservation.sent";

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

  async getLogs(projectId: string, filters?: LogFilters, period?: Period): Promise<Log[]> {
    const dto = await this.client.get<GlitchTipLogDto[]>(
      `/api/0/organizations/${this.organizationSlug}/logs/`,
      {
        project: projectId,
        start: period?.from,
        end: period?.to,
        query: filters?.query,
      },
    );
    return dto.map(mapGlitchTipLog);
  }

  getReservations(projectId: string, period: Period): Promise<Log[]> {
    return this.getLogs(projectId, { query: RESERVATION_TAG }, period);
  }
}
