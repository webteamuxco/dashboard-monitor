import "server-only";
import { cache } from "react";
import type { Issue } from "@/lib/errorMonitor/domain/Issue";
import type { IssueRow } from "../domain/IssueRow";
import type { IssueDetailView } from "../domain/IssueDetailView";
import { getErrorMonitorFactory } from "@/lib/errorMonitor/GetErrorMonitor";

const EVENTS_PAGE_SIZE = 25;

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

const fetchRecent = cache(
  async (
    documentId: string,
    limit: number,
    environment: string | null,
  ): Promise<IssueRow[]> => {
    
      const errorMonitorFactory = await getErrorMonitorFactory(documentId)
      const connection = await errorMonitorFactory.createConnection(documentId)
      const strategy =  errorMonitorFactory.createStrategy(connection)
      const issues = await strategy.getIssues(connection.projectId, {
        limit,
        environment: environment ?? undefined,
      });
      
      return issues.map(toRow);
  },
);

const fetchRecentUnresolved = cache(
  async (
    documentId: string,
    limit: number,
    environment: string | null,
  ): Promise<IssueRow[]> => {
    const errorMonitorFactory = await getErrorMonitorFactory(documentId)
    const connection = await errorMonitorFactory.createConnection(documentId)
    const strategy =  errorMonitorFactory.createStrategy(connection)
    const issues = await strategy.getIssues(connection.projectId, {
      resolved: false,
      limit,
      environment: environment ?? undefined,
    });
    return issues.map(toRow);
  },
);

const fetchDetail = cache(
  async (documentId: string, issueId: string): Promise<IssueDetailView> => {
    const errorMonitorFactory = await getErrorMonitorFactory(documentId)
    const connection = await errorMonitorFactory.createConnection(documentId)
    const monitor =  errorMonitorFactory.createStrategy(connection)

    const [issue, latestEvent, events, comments] = await Promise.all([
      monitor.getIssue(issueId),
      monitor.getIssueLatestEvent(issueId),
      monitor.getIssueEvents(issueId, EVENTS_PAGE_SIZE),
      monitor.getIssueComments(issueId),
    ]);

    return {
      issue: {
        ...toRow(issue),
        firstSeenIso: issue.firstSeen,
        firstSeenLabel: formatRelative(issue.firstSeen),
      },
      latestEvent,
      events,
      comments,
    };
  },
);

export class IssuesDataAccess {

  getRecent(
    documentId: string,
    limit = 20,
    environment: string | null = null,
  ): Promise<IssueRow[]> {
    return fetchRecent(documentId, limit, environment);
  }

  getRecentUnresolved(
    documentId: string,
    limit = 20,
    environment: string | null = null,
  ): Promise<IssueRow[]> {
    return fetchRecentUnresolved(documentId, limit, environment);
  }

  getDetail(documentId: string, issueId: string): Promise<IssueDetailView> {
    return fetchDetail(documentId, issueId);
  }
}

export const issuesDataAccess = new IssuesDataAccess();
