import type { IssueEvent } from "@/lib/errorMonitor/domain/IssueEvent";
import type { IssueComment } from "@/lib/errorMonitor/domain/IssueComment";
import type { IssueRow } from "./IssueRow";

export interface IssueDetailView {
  issue: IssueRow & {
    firstSeenIso: string;
    firstSeenLabel: string;
  };
  latestEvent: IssueEvent | null;
  events: IssueEvent[];
  comments: IssueComment[];
}
