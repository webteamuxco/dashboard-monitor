import "server-only";
import type { LogMonitorStrategyInterface } from "../../strategy/LogMonitorStrategyInterface";
import type { Log, LogFilters } from "../../domain/Log";
import type { Period } from "@/lib/shared/domain/Period";
import type { GlitchTipClient } from "@/lib/glitchtip/GlitchTipClient";
import type { GlitchTipLogDto } from "./dto/GlitchTipLogs";
import { mapGlitchTipLog } from "./mappers/logsMapper";

export class GlitchTipLogMonitorStrategy implements LogMonitorStrategyInterface {
  constructor(
    private readonly client: GlitchTipClient,
    private readonly organizationSlug: string,
  ) {}

  async getLogs(projectId: string, filters?: LogFilters, period?: Period): Promise<Log[]> {
    const dto = await this.client.getPaginated<GlitchTipLogDto>(
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
}
