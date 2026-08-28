import { ErrorLevel } from "@/lib/errorMonitor/domain/ErrorLevel";


export interface IssueRow {
  id: string;
  title: string;
  type: string;
  level: ErrorLevel;
  projectId: string;
  eventCount: number;
  lastSeenIso: string;
  lastSeenLabel: string;
  isResolved: boolean;
}
