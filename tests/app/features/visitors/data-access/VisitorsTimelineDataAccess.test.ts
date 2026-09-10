import { describe, it, expect, vi, beforeEach } from "vitest";

import { posthogWiring } from "../../../../helpers/toolWiring";

// vi.mock is hoisted above every const, so the mock function it reads
// has to be hoisted with it.
const { loadToolWiringMock } = vi.hoisted(() => ({
  loadToolWiringMock: vi.fn(),
}));

const WIRING = posthogWiring();

const getActiveUsersTimelineMock = vi.fn();
const createConnectionMock = vi.fn(() => ({
  baseUrl: "https://ph",
  projectId: "ph-project",
}));

vi.mock("@/lib/config/domain/loadToolWiring", () => ({
  DASHBOARD_KPI: "dashboard-kpi",
  DASHBOARD_BLOCK: "dashboard-block",
  loadToolWiring: loadToolWiringMock,
}));

vi.mock("@/lib/trackerMonitor/GetTrackerMonitor", () => ({
  getTrackerMonitor: () => ({
    createConnection: createConnectionMock,
    createStrategy: () => ({ getActiveUsersTimeline: getActiveUsersTimelineMock }),
  }),
}));

import { VisitorsTimelineDataAccess } from "@/app/features/visitors/data-access/VisitorsTimelineDataAccess";
import { DASHBOARD_KPI } from "@/lib/config/domain/loadToolWiring";

describe("VisitorsTimelineDataAccess.getSeries", () => {
  beforeEach(() => {
    getActiveUsersTimelineMock.mockReset();
    loadToolWiringMock.mockReset();
    loadToolWiringMock.mockResolvedValue(WIRING);
    createConnectionMock.mockClear();
  });

  it("loads the wiring of the element it was given, then connects from it", async () => {
    getActiveUsersTimelineMock.mockResolvedValue([]);

    await new VisitorsTimelineDataAccess().getSeries(DASHBOARD_KPI, "doc1", 60);

    expect(loadToolWiringMock).toHaveBeenCalledWith(DASHBOARD_KPI, "doc1");
    expect(createConnectionMock).toHaveBeenCalledWith(WIRING);
  });

  it("forwards the resolved projectId and windowMinutes to the tracker monitor", async () => {
    getActiveUsersTimelineMock.mockResolvedValue([]);

    await new VisitorsTimelineDataAccess().getSeries(DASHBOARD_KPI, "doc1", 60);

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

    const out = await new VisitorsTimelineDataAccess().getSeries(DASHBOARD_KPI, "p", 5);

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

    expect(await new VisitorsTimelineDataAccess().getSeries(DASHBOARD_KPI, "p", 5)).toEqual([]);
  });
});
