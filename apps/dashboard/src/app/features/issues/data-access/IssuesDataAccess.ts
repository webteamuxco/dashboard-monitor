import "server-only";
import { cache } from "react";
import type { Issue } from "@/lib/errorMonitor/domain/Issue";
import type { IssueRow } from "../domain/IssueRow";
import type { IssueDetailView } from "../domain/IssueDetailView";
import { getErrorMonitorFactory } from "@/lib/errorMonitor/GetErrorMonitor";
import type {
  IssueComment,
  NewIssueComment,
} from "@/lib/errorMonitor/domain/IssueComment";
import type { CommentDTO } from "../domain/commentsDto";
import {
  DashboardElementKind,
  loadToolWiring,
} from "@/lib/config/domain/loadToolWiring";
import type { ErrorMonitorStrategyInterface } from "@/lib/errorMonitor/strategy/ErrorMonitorStrategyInterface";
import { StatusDTO } from "../domain/statusDto";

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

async function resolveMonitor(
  kind: DashboardElementKind,
  documentId: string,
): Promise<ErrorMonitorStrategyInterface> {
  const wiring = await loadToolWiring(kind, documentId);
  const factory = getErrorMonitorFactory(wiring);

  return factory.createStrategy(factory.createConnection());
}

const postIssueComment =
  async (
    kind: DashboardElementKind,
    documentId: string,
    issueId: string,
    dto: NewIssueComment,
  ): Promise<IssueComment> => {
    const strategy = await resolveMonitor(kind, documentId);

    return await strategy.createIssueComment(issueId, dto);
}


const putIssueStatus =
  async (
    kind: DashboardElementKind,
    documentId: string,
    issueId: string,
    content: StatusDTO,
  ): Promise<Issue> => {
    const strategy = await resolveMonitor(kind, documentId);

    return await strategy.updateIssueStatus(issueId, { status: content.status });
}

const fetchDetail = cache(
  async (
    kind: DashboardElementKind,
    documentId: string,
    issueId: string,
  ): Promise<IssueDetailView> => {
    const monitor = await resolveMonitor(kind, documentId);

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

  getDetail(
    kind: DashboardElementKind,
    documentId: string,
    issueId: string,
  ): Promise<IssueDetailView> {
    return fetchDetail(kind, documentId, issueId);
  }

  postComment(
    kind: DashboardElementKind,
    documentId: string,
    issueId: string,
    content: CommentDTO,
  ): Promise<IssueComment> {
    return postIssueComment(kind, documentId, issueId, {
      text: content.content,
    });
  }

  updateStatus(
    kind: DashboardElementKind,
    documentId: string,
    issueId: string,
    content: StatusDTO,
  ): Promise<Issue> {
    return putIssueStatus(kind, documentId, issueId, content);
  }
}

export const issuesDataAccess = new IssuesDataAccess();
