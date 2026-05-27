import type { Issue, IssueFilters } from "../domain/Issue";
import type { Period } from "@/lib/shared/domain/Period";
import type { TimeSeriesPoint } from "../domain/TimeSeriesPoint";
import type { IssueEvent } from "../domain/IssueEvent";
import type { IssueComment } from "../domain/IssueComment";

export interface ErrorMonitorStrategyInterface {
  getIssues(projectId: string, filters?: IssueFilters): Promise<Issue[]>;
  getErrorStats(projectId: string, period: Period): Promise<TimeSeriesPoint[]>;
  getIssue(issueId: string): Promise<Issue>;
  getIssueLatestEvent(issueId: string): Promise<IssueEvent | null>;
  getIssueEvents(issueId: string, limit?: number): Promise<IssueEvent[]>;
  getIssueComments(issueId: string): Promise<IssueComment[]>;
}
