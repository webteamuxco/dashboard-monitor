import type { Issue } from "./Issue";
import type { IssueEvent } from "./IssueEvent";
import type { IssueComment } from "./IssueComment";

export interface IssueDetail {
  issue: Issue;
  latestEvent: IssueEvent | null;
  events: IssueEvent[];
  comments: IssueComment[];
}
