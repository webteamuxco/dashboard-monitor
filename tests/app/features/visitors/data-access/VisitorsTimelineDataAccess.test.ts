import { describe, it, expect, vi, beforeEach } from "vitest";

const getActiveUsersTimelineMock = vi.fn();

vi.mock("@/lib/trackerMonitor/GetTrackerMonitor", () => ({
  getTrackerMonitor: () => ({ getActiveUsersTimeline: getActiveUsersTimelineMock }),
}));

vi.mock("@/lib/shared/services/PosthogConfig", () => ({
  resolvePosthogConnection: vi.fn(async () => ({
    baseUrl: "https://ph",
    projectId: "ph-project",
  })),
}));

import { VisitorsTimelineDataAccess } from "@/app/features/visitors/data-access/VisitorsTimelineDataAccess";

describe("VisitorsTimelineDataAccess.getSeries", () => {
  beforeEach(() => {
    getActiveUsersTimelineMock.mockReset();
  });

  it("forwards the resolved projectId and windowMinutes to the tracker monitor", async () => {
    getActiveUsersTimelineMock.mockResolvedValue([]);

    await new VisitorsTimelineDataAccess().getSeries("doc1", 60);

    expect(getActiveUsersTimelineMock).toHaveBeenCalledWith("ph-project", 60);
  });

  it("maps each VisitorsTimeSeriesPoint to a VisitorPoint", async () => {
    getActiveUsersTimelineMock.mockResolvedValue([
      {
        minuteIso: "2026-05-28T08:00:00Z",
        label: "10:00",
        newCount: 3,
        returningCount: 5,
      },
    ]);

    const out = await new VisitorsTimelineDataAccess().getSeries("p", 5);

    expect(out).toEqual([
      {
        minuteIso: "2026-05-28T08:00:00Z",
        label: "10:00",
        newCount: 3,
        returningCount: 5,
      },
    ]);
  });

  it("returns an empty array when the upstream returns nothing", async () => {
    getActiveUsersTimelineMock.mockResolvedValue([]);

    expect(await new VisitorsTimelineDataAccess().getSeries("p", 5)).toEqual([]);
  });
});
