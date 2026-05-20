import "server-only";
import { cache } from "react";
import { getErrorMonitor } from "@/lib/errorMonitor/GetErrorMonitor";
import type { Issue } from "@/lib/errorMonitor/domain/Issue";
import type { IssueRow } from "../domain/IssueRow";

function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffSec = Math.round((then.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const formatter = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (abs < 60) return formatter.format(diffSec, "second");
  if (abs < 3600) return formatter.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(diffSec / 3600), "hour");
  return formatter.format(Math.round(diffSec / 86400), "day");
}

function toRow(issue: Issue): IssueRow {
  return {
    id: issue.id,
    title: issue.title,
    type: issue.type,
    level: issue.level,
    projectId: issue.projectId,
    eventCount: issue.eventCount,
    lastSeenIso: issue.lastSeen,
    lastSeenLabel: formatRelative(issue.lastSeen),
    isResolved: issue.isResolved,
  };
}

const fetchRecentUnresolved = cache(
  async (projectId: string, limit: number): Promise<IssueRow[]> => {
    const issues = await getErrorMonitor().getIssues(projectId, {
      resolved: false,
      limit,
    });
    return issues.map(toRow);
  },
);

export class IssuesDataAccess {
  getRecentUnresolved(projectId: string, limit = 20): Promise<IssueRow[]> {
    return fetchRecentUnresolved(projectId, limit);
  }
}

export const issuesDataAccess = new IssuesDataAccess();
