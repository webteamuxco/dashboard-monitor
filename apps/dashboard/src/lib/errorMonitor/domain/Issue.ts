import { ErrorLevel } from "./ErrorLevel";

export interface Issue {
  id: string;
  title: string;
  type: string;
  level: ErrorLevel;
  projectId: string;
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  isResolved: boolean;
}

export interface IssueFilters {
  level?: ErrorLevel;
  resolved?: boolean;
  limit?: number;
}
