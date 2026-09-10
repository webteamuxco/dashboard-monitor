import { describe, it, expect, vi, beforeEach } from "vitest";
import { glitchtipWiring, posthogWiring } from "../../../../helpers/toolWiring";

const {
  loadToolWiringMock,
  getErrorStatsMock,
  getIssuesMock,
  getLogsMock,
  getActiveUsersTimelineMock,
  getTotalVisitorsMock,
} = vi.hoisted(() => ({
  loadToolWiringMock: vi.fn(),
  getErrorStatsMock: vi.fn(),
  getIssuesMock: vi.fn(),
  getLogsMock: vi.fn(),
  getActiveUsersTimelineMock: vi.fn(),
  getTotalVisitorsMock: vi.fn(),
}));

vi.mock("@/lib/config/domain/loadToolWiring", () => ({
  DASHBOARD_KPI: "dashboard-kpi",
  DASHBOARD_BLOCK: "dashboard-block",
  loadToolWiring: loadToolWiringMock,
}));

const CONNECTION = {
  baseUrl: "https://gt",
  organizationSlug: "org",
  projectId: "provider-project",
};

vi.mock("@/lib/errorMonitor/GetErrorMonitor", () => ({
  getErrorMonitorFactory: () => ({
    createConnection: () => CONNECTION,
    createStrategy: () => ({
      getErrorStats: getErrorStatsMock,
      getIssues: getIssuesMock,
    }),
  }),
}));

vi.mock("@/lib/logMonitor/GetLogMonitor", () => ({
  getLogMonitor: () => ({
    createConnection: () => CONNECTION,
    createStrategy: () => ({ getLogs: getLogsMock }),
  }),
}));

vi.mock("@/lib/trackerMonitor/GetTrackerMonitor", () => ({
  getTrackerMonitor: () => ({
    createConnection: () => ({ baseUrl: "https://ph", projectId: "ph-project" }),
    createStrategy: () => ({
      getActiveUsersTimeline: getActiveUsersTimelineMock,
      getTotalVisitors: getTotalVisitorsMock,
    }),
  }),
}));

import { KpisDataAccess } from "@/app/features/kpis/data-access/KpisDataAccess";
import { DASHBOARD_KPI } from "@/lib/config/domain/loadToolWiring";

const LOG_WIRING = glitchtipWiring({
  strategy: {
    kind: "log-monitor",
    id: "s2",
    tags: [
      { id: "t1", name: "reservation", value: "reservation.sent", description: null },
    ],
  },
});

describe("KpisDataAccess.getMeasure", () => {
  beforeEach(() => {
    loadToolWiringMock.mockReset();
    getErrorStatsMock.mockReset();
    getIssuesMock.mockReset();
    getLogsMock.mockReset();
    getActiveUsersTimelineMock.mockReset();
    getTotalVisitorsMock.mockReset();
  });

  it("loads the wiring of the element it was given", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());
    getErrorStatsMock.mockResolvedValue({ interval: "1h", points: [] });

    await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-42", 30);

    expect(loadToolWiringMock).toHaveBeenCalledWith(DASHBOARD_KPI, "kpi-42");
  });

  describe("error-monitor", () => {
    it("sums the error stats over the window", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      getErrorStatsMock.mockResolvedValue({
        interval: "1m",
        points: [
          { timestamp: "2026-09-09T08:00:00Z", count: 4 },
          { timestamp: "2026-09-09T08:01:00Z", count: 7 },
        ],
      });

      const measure = await new KpisDataAccess().getMeasure(
        DASHBOARD_KPI,
        "kpi-1",
        30,
      );

      expect(measure).toEqual({ value: 11, windowMinutes: 30 });
    });

    it("queries the provider project id, never the Strapi one", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      getErrorStatsMock.mockResolvedValue({ interval: "1h", points: [] });

      await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-1", 30, "production");

      const [projectId, period, environment] = getErrorStatsMock.mock.calls[0];
      expect(projectId).toBe("provider-project");
      expect(environment).toBe("production");
      expect(
        new Date(period.to).getTime() - new Date(period.from).getTime(),
      ).toBe(30 * 60_000);
    });

    it("treats a null bucket as zero without coercing the sum to NaN", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      getErrorStatsMock.mockResolvedValue({
        interval: "1m",
        points: [
          { timestamp: "2026-09-09T08:00:00Z", count: null },
          { timestamp: "2026-09-09T08:01:00Z", count: 2 },
        ],
      });

      const measure = await new KpisDataAccess().getMeasure(
        DASHBOARD_KPI,
        "kpi-1",
        30,
      );

      expect(measure.value).toBe(2);
    });

    it("keeps the buckets coarse on a wide window", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      getErrorStatsMock.mockResolvedValue({ interval: "1h", points: [] });

      await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-1", 24 * 60);

      expect(getErrorStatsMock.mock.calls[0][1].interval).toBe("1h");
    });
  });

  describe("log-monitor", () => {
    it("counts the logs matching the strategy's tags", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);
      getLogsMock.mockResolvedValue([{ id: "l1" }, { id: "l2" }, { id: "l3" }]);

      const measure = await new KpisDataAccess().getMeasure(
        DASHBOARD_KPI,
        "kpi-2",
        15,
      );

      expect(measure).toEqual({ value: 3, windowMinutes: 15 });
    });

    it("builds the query from the tags Strapi declares, not from a constant", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);
      getLogsMock.mockResolvedValue([]);

      await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-2", 15);

      expect(getLogsMock.mock.calls[0][1]).toEqual({ query: "reservation.sent" });
    });

    it("suffixes each tag with the environment", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);
      getLogsMock.mockResolvedValue([]);

      await new KpisDataAccess().getMeasure(
        DASHBOARD_KPI,
        "kpi-2",
        15,
        "staging",
      );

      expect(getLogsMock.mock.calls[0][1]).toEqual({
        query: "reservation.sent.staging",
      });
    });

    it("throws rather than counting everything when no tag is declared", async () => {
      loadToolWiringMock.mockResolvedValue(
        glitchtipWiring({ strategy: { kind: "log-monitor", id: "s2", tags: [] } }),
      );

      await expect(
        new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-2", 15),
      ).rejects.toThrow(/declares no tag/);
      expect(getLogsMock).not.toHaveBeenCalled();
    });
  });

  describe("tracker-monitor", () => {
    it("sums new and returning visitors over the window", async () => {
      loadToolWiringMock.mockResolvedValue(posthogWiring());
      getActiveUsersTimelineMock.mockResolvedValue([
        { minuteIso: "…", label: "10:00", newCount: 2, returningCount: 3 },
        { minuteIso: "…", label: "10:01", newCount: 1, returningCount: 0 },
      ]);

      const measure = await new KpisDataAccess().getMeasure(
        DASHBOARD_KPI,
        "kpi-3",
        60,
      );

      expect(measure).toEqual({ value: 6, windowMinutes: 60 });
      expect(getActiveUsersTimelineMock).toHaveBeenCalledWith("ph-project", 60);
    });
  });

  // A KPI whose Strapi `type` is not `interval` measures a total: the route
  // sends no window at all, and no family may fall back to one.
  describe("without a window", () => {
    it("counts the open issues instead of summing a series", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      getIssuesMock.mockResolvedValue([{ id: "i1" }, { id: "i2" }]);

      const measure = await new KpisDataAccess().getMeasure(
        DASHBOARD_KPI,
        "kpi-1",
        null,
        "production",
      );

      expect(measure).toEqual({ value: 2, windowMinutes: null });
      expect(getErrorStatsMock).not.toHaveBeenCalled();
      expect(getIssuesMock).toHaveBeenCalledWith("provider-project", {
        resolved: false,
        environment: "production",
      });
    });

    it("caps nothing when counting the open issues", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());
      getIssuesMock.mockResolvedValue([]);

      await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-1", null);

      expect(getIssuesMock.mock.calls[0][1]).not.toHaveProperty("limit");
    });

    it("reads the logs with no period, keeping the tag filter", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);
      getLogsMock.mockResolvedValue([{ id: "l1" }]);

      const measure = await new KpisDataAccess().getMeasure(
        DASHBOARD_KPI,
        "kpi-2",
        null,
      );

      expect(measure).toEqual({ value: 1, windowMinutes: null });
      expect(getLogsMock.mock.calls[0][1]).toEqual({ query: "reservation.sent" });
      expect(getLogsMock.mock.calls[0][2]).toBeUndefined();
    });

    it("reads the visitors total instead of the timeline", async () => {
      loadToolWiringMock.mockResolvedValue(posthogWiring());
      getTotalVisitorsMock.mockResolvedValue(1234);

      const measure = await new KpisDataAccess().getMeasure(
        DASHBOARD_KPI,
        "kpi-3",
        null,
      );

      expect(measure).toEqual({ value: 1234, windowMinutes: null });
      expect(getTotalVisitorsMock).toHaveBeenCalledWith("ph-project");
      expect(getActiveUsersTimelineMock).not.toHaveBeenCalled();
    });

    it("still refuses a log monitor with no tag", async () => {
      loadToolWiringMock.mockResolvedValue(
        glitchtipWiring({ strategy: { kind: "log-monitor", id: "s2", tags: [] } }),
      );

      await expect(
        new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-2", null),
      ).rejects.toThrow(/declares no tag/);
      expect(getLogsMock).not.toHaveBeenCalled();
    });
  });

  it("throws naming the element when it declares no strategy", async () => {
    loadToolWiringMock.mockResolvedValue(
      glitchtipWiring({ id: "kpi-9", strategy: undefined }),
    );

    await expect(
      new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-9", 30),
    ).rejects.toThrow(/"kpi-9" declares no strategy/);
  });
});
