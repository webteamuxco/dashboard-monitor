import type { Issue, IssueFilters } from "../domain/Issue";
import type { Period } from "@/lib/shared/domain/Period";
import type { TimeSeries } from "../domain/TimeSeriesPoint";
import type { IssueEvent } from "../domain/IssueEvent";
import type { IssueComment, NewIssueComment } from "../domain/IssueComment";

export interface ErrorMonitorStrategyInterface {

  // GET
  getIssues(projectId: string, filters?: IssueFilters): Promise<Issue[]>;
  // Counted per event, so a total is always the sum of its environments, and
  // the series says when the adapter could not read the whole window.
  getErrorStats(
    projectId: string,
    period: Period,
    environment?: string,
  ): Promise<TimeSeries>;
  // A group's aggregates (`eventCount`, `firstSeen`, `lastSeen`) span every
  // environment — no provider exposes them per environment.
  getIssue(issueId: string): Promise<Issue>;
  getIssueLatestEvent(
    issueId: string,
    environment?: string,
  ): Promise<IssueEvent | null>;
  getIssueEvents(
    issueId: string,
    limit?: number,
    environment?: string,
  ): Promise<IssueEvent[]>;
  getIssueComments(issueId: string): Promise<IssueComment[]>;

  // POST
  createIssueComment(
    issueId: string,
    comment: NewIssueComment,
  ): Promise<IssueComment>;
}
