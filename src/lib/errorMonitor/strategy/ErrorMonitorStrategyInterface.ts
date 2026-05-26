import type { Issue, IssueFilters } from "../domain/Issue";
import type { Period } from "@/lib/shared/domain/Period";
import type { TimeSeriesPoint } from "../domain/TimeSeriesPoint";

export interface ErrorMonitorStrategyInterface {
  getIssues(projectId: string, filters?: IssueFilters): Promise<Issue[]>;
  getErrorStats(projectId: string, period: Period): Promise<TimeSeriesPoint[]>;
}
