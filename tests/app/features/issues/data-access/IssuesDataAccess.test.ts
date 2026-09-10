import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { glitchtipWiring } from "../../../../helpers/toolWiring";

// vi.mock is hoisted above every const, so the mock function it reads
// has to be hoisted with it.
const { loadToolWiringMock } = vi.hoisted(() => ({
  loadToolWiringMock: vi.fn(),
}));

const WIRING = glitchtipWiring();

const getIssuesMock = vi.fn();
const getIssueMock = vi.fn();
const getIssueLatestEventMock = vi.fn();
const getIssueEventsMock = vi.fn();
const getIssueCommentsMock = vi.fn();
const createIssueCommentMock = vi.fn();

const createConnectionMock = vi.fn(() => ({
  baseUrl: "https://gt",
  organizationSlug: "org",
  projectId: "gt-project",
}));

vi.mock("@/lib/config/domain/loadToolWiring", () => ({
  DASHBOARD_KPI: "dashboard-kpi",
  DASHBOARD_BLOCK: "dashboard-block",
  loadToolWiring: loadToolWiringMock,
}));

vi.mock("@/lib/errorMonitor/GetErrorMonitor", () => ({
  getErrorMonitorFactory: () => ({
    createConnection: createConnectionMock,
    createStrategy: () => ({
      getIssues: getIssuesMock,
      getIssue: getIssueMock,
      getIssueLatestEvent: getIssueLatestEventMock,
      getIssueEvents: getIssueEventsMock,
      getIssueComments: getIssueCommentsMock,
      createIssueComment: createIssueCommentMock,
      getErrorStats: vi.fn(),
    }),
  }),
}));

import { IssuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess";
import { DASHBOARD_KPI } from "@/lib/config/domain/loadToolWiring";
import type { Issue } from "@/lib/errorMonitor/domain/Issue";

function buildIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "i1",
    title: "boom",
    type: "TypeError",
    level: "error",
    projectId: "p1",
    firstSeen: "2026-05-28T07:00:00Z",
    lastSeen: "2026-05-28T08:00:00Z",
    eventCount: 3,
    isResolved: false,
    ...overrides,
  };
}

const NOW = new Date("2026-05-28T08:30:00Z");

describe("IssuesDataAccess", () => {
  beforeEach(() => {
    getIssuesMock.mockReset();
    getIssueMock.mockReset();
    getIssueLatestEventMock.mockReset();
    getIssueEventsMock.mockReset();
    getIssueCommentsMock.mockReset();
    createIssueCommentMock.mockReset();
    loadToolWiringMock.mockReset();
    loadToolWiringMock.mockResolvedValue(WIRING);
    createConnectionMock.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getRecent", () => {
    it("queries without a status filter — resolved issues show up too", async () => {
      getIssuesMock.mockResolvedValue([]);

      // This is what /api/issues and the server prefetch both call, so the
      // first paint and the first poll must agree.
      await new IssuesDataAccess().getRecent(DASHBOARD_KPI, "doc-recent-1", 50);

      expect(getIssuesMock).toHaveBeenCalledWith("gt-project", { limit: 50 });
    });

    it("defaults limit to 20 when omitted", async () => {
      getIssuesMock.mockResolvedValue([]);

      await new IssuesDataAccess().getRecent(DASHBOARD_KPI, "doc-recent-2");

      expect(getIssuesMock).toHaveBeenCalledWith("gt-project", { limit: 20 });
    });

    it("forwards the environment into the issue filters", async () => {
      getIssuesMock.mockResolvedValue([]);

      await new IssuesDataAccess().getRecent(DASHBOARD_KPI, "doc-recent-3", 20, "production");

      expect(getIssuesMock).toHaveBeenCalledWith("gt-project", {
        limit: 20,
        environment: "production",
      });
    });

    it("resolves the factory from the panel documentId it was given", async () => {
      getIssuesMock.mockResolvedValue([]);

      await new IssuesDataAccess().getRecent(DASHBOARD_KPI, "panel-42", 20);

      expect(loadToolWiringMock).toHaveBeenCalledWith(DASHBOARD_KPI, "panel-42");
      expect(createConnectionMock).toHaveBeenCalledWith(WIRING);
    });

    it("maps each Issue into an IssueRow", async () => {
      getIssuesMock.mockResolvedValue([
        buildIssue({ id: "i9", isResolved: true }),
      ]);

      const out = await new IssuesDataAccess().getRecent(DASHBOARD_KPI, "doc-recent-4", 10);

      expect(out[0]).toMatchObject({ id: "i9", isResolved: true });
      expect(out[0].lastSeenLabel).toBeTypeOf("string");
    });
  });

  describe("getRecentUnresolved", () => {
    it("queries unresolved issues with the provided limit", async () => {
      getIssuesMock.mockResolvedValue([]);

      await new IssuesDataAccess().getRecentUnresolved(DASHBOARD_KPI, "doc1", 50);

      expect(getIssuesMock).toHaveBeenCalledWith("gt-project", { resolved: false, limit: 50 });
    });

    it("defaults limit to 20 when omitted", async () => {
      getIssuesMock.mockResolvedValue([]);

      await new IssuesDataAccess().getRecentUnresolved(DASHBOARD_KPI, "doc1");

      expect(getIssuesMock).toHaveBeenCalledWith("gt-project", { resolved: false, limit: 20 });
    });

    it("forwards the environment into the issue filters", async () => {
      getIssuesMock.mockResolvedValue([]);

      await new IssuesDataAccess().getRecentUnresolved(DASHBOARD_KPI, "doc1", 20, "production");

      expect(getIssuesMock).toHaveBeenCalledWith("gt-project", {
        resolved: false,
        limit: 20,
        environment: "production",
      });
    });

    it("maps each Issue into an IssueRow with a relative lastSeen label", async () => {
      getIssuesMock.mockResolvedValue([
        buildIssue({ id: "i1", lastSeen: "2026-05-28T08:29:00Z" }),
      ]);

      const out = await new IssuesDataAccess().getRecentUnresolved(DASHBOARD_KPI, "doc1", 10);

      expect(out[0]).toMatchObject({
        id: "i1",
        title: "boom",
        type: "TypeError",
        eventCount: 3,
        isResolved: false,
        lastSeenIso: "2026-05-28T08:29:00Z",
      });
      expect(out[0].lastSeenLabel).toMatch(/min|seconde/i);
    });
  });

  describe("getDetail", () => {
    it("fetches issue, latest event, events, and comments in parallel", async () => {
      getIssueMock.mockResolvedValue(buildIssue({ id: "i42" }));
      getIssueLatestEventMock.mockResolvedValue(null);
      getIssueEventsMock.mockResolvedValue([]);
      getIssueCommentsMock.mockResolvedValue([]);

      const out = await new IssuesDataAccess().getDetail(DASHBOARD_KPI, "doc1", "i42");

      expect(getIssueMock).toHaveBeenCalledWith("i42");
      expect(getIssueLatestEventMock).toHaveBeenCalledWith("i42");
      expect(getIssueEventsMock).toHaveBeenCalledWith("i42", 25);
      expect(getIssueCommentsMock).toHaveBeenCalledWith("i42");

      expect(out.issue).toMatchObject({
        id: "i42",
        firstSeenIso: "2026-05-28T07:00:00Z",
      });
      expect(out.issue.firstSeenLabel).toBeTruthy();
      expect(out.latestEvent).toBeNull();
      expect(out.events).toEqual([]);
      expect(out.comments).toEqual([]);
    });

    it("forwards latest event and events/comments arrays into the view", async () => {
      getIssueMock.mockResolvedValue(buildIssue());
      const evt = { id: "e1", eventID: "x", dateCreated: "now" };
      getIssueLatestEventMock.mockResolvedValue(evt);
      getIssueEventsMock.mockResolvedValue([evt, evt]);
      getIssueCommentsMock.mockResolvedValue([{ id: "c1" }]);

      const out = await new IssuesDataAccess().getDetail(DASHBOARD_KPI, "doc1", "i");

      expect(out.latestEvent).toEqual(evt);
      expect(out.events).toHaveLength(2);
      expect(out.comments).toEqual([{ id: "c1" }]);
    });
  });

  describe("postComment", () => {
    it("resolves the factory from the panel documentId it was given", async () => {
      createIssueCommentMock.mockResolvedValue({ id: "c1" });

      await new IssuesDataAccess().postComment(DASHBOARD_KPI, "panel-42", "i1", {
        content: "on it",
      });

      expect(loadToolWiringMock).toHaveBeenCalledWith(DASHBOARD_KPI, "panel-42");
      expect(createConnectionMock).toHaveBeenCalledWith(WIRING);
    });

    it("renames the DTO's content into the domain's text", async () => {
      createIssueCommentMock.mockResolvedValue({ id: "c1" });

      await new IssuesDataAccess().postComment(DASHBOARD_KPI, "doc1", "i42", {
        content: "on it",
      });

      expect(createIssueCommentMock).toHaveBeenCalledWith("i42", {
        text: "on it",
      });
    });

    it("returns the created comment as the strategy mapped it", async () => {
      createIssueCommentMock.mockResolvedValue({
        id: "c9",
        dateCreated: "2026-05-28T08:29:00Z",
        text: "on it",
        authorName: "Mickael",
        authorEmail: null,
      });

      const out = await new IssuesDataAccess().postComment(DASHBOARD_KPI, "doc1", "i1", {
        content: "on it",
      });

      expect(out).toMatchObject({ id: "c9", text: "on it" });
    });

    it("lets a provider failure bubble up — the route turns it into a 502", async () => {
      createIssueCommentMock.mockRejectedValue(
        new Error("GlitchTip API error 403 on /api/0/issues/i1/comments/"),
      );

      await expect(
        new IssuesDataAccess().postComment(DASHBOARD_KPI, "doc1", "i1", { content: "on it" }),
      ).rejects.toThrow(/403/);
    });

    it("is not memoized — two identical comments both reach the provider", async () => {
      createIssueCommentMock.mockResolvedValue({ id: "c1" });

      const dataAccess = new IssuesDataAccess();
      await dataAccess.postComment(DASHBOARD_KPI, "doc1", "i1", { content: "ping" });
      await dataAccess.postComment(DASHBOARD_KPI, "doc1", "i1", { content: "ping" });

      expect(createIssueCommentMock).toHaveBeenCalledTimes(2);
    });
  });
});
