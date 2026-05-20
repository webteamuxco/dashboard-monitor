import type { Issue, IssueFilters } from "../domain/Issue";
import type { Log, LogFilters } from "../domain/Log";
import type { Period } from "../domain/Period";

export interface ErrorMonitorStrategyInterface {
  getIssues(projectId: string, filters?: IssueFilters): Promise<Issue[]>;
  getLogs(projectId: string, filters?: LogFilters, period?: Period): Promise<Log[]>;
  getReservations(projectId: string, period: Period): Promise<Log[]>;
}
