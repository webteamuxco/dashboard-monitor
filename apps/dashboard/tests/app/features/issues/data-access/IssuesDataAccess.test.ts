import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getIssuesMock = vi.fn();
const getIssueMock = vi.fn();
const getIssueLatestEventMock = vi.fn();
const getIssueEventsMock = vi.fn();
const getIssueCommentsMock = vi.fn();

vi.mock("@/lib/errorMonitor/GetErrorMonitor", () => ({
  getErrorMonitor: () => ({
    getIssues: getIssuesMock,
    getIssue: getIssueMock,
    getIssueLatestEvent: getIssueLatestEventMock,
    getIssueEvents: getIssueEventsMock,
    getIssueComments: getIssueCommentsMock,
    getErrorStats: vi.fn(),
  }),
}));

import { IssuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess";
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
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getRecentUnresolved", () => {
    it("queries unresolved issues with the provided limit", async () => {
      getIssuesMock.mockResolvedValue([]);

      await new IssuesDataAccess().getRecentUnresolved("p1", 50);

      expect(getIssuesMock).toHaveBeenCalledWith("p1", { resolved: false, limit: 50 });
    });

    it("defaults limit to 20 when omitted", async () => {
      getIssuesMock.mockResolvedValue([]);

      await new IssuesDataAccess().getRecentUnresolved("p1");

      expect(getIssuesMock).toHaveBeenCalledWith("p1", { resolved: false, limit: 20 });
    });

    it("maps each Issue into an IssueRow with a relative lastSeen label", async () => {
      getIssuesMock.mockResolvedValue([
        buildIssue({ id: "i1", lastSeen: "2026-05-28T08:29:00Z" }),
      ]);

      const out = await new IssuesDataAccess().getRecentUnresolved("p", 10);

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

      const out = await new IssuesDataAccess().getDetail("i42");

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

      const out = await new IssuesDataAccess().getDetail("i");

      expect(out.latestEvent).toEqual(evt);
      expect(out.events).toHaveLength(2);
      expect(out.comments).toEqual([{ id: "c1" }]);
    });
  });
});
