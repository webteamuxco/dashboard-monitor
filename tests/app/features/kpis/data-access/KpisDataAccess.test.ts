import { describe, it, expect, vi, beforeEach } from "vitest";
import { glitchtipWiring, posthogWiring } from "../../../../helpers/toolWiring";

const {
  loadToolWiringMock,
  errorMeasuresMock,
  logMeasuresMock,
  trackerMeasuresMock,
} = vi.hoisted(() => ({
  loadToolWiringMock: vi.fn(),
  errorMeasuresMock: vi.fn(),
  logMeasuresMock: vi.fn(),
  trackerMeasuresMock: vi.fn(),
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

const createErrorConnectionMock = vi.fn(() => CONNECTION);

vi.mock("@/lib/errorMonitor/GetErrorMonitor", () => ({
  getErrorMonitorFactory: () => ({
    createConnection: createErrorConnectionMock,
    createStrategy: () => ({ getKpiMeasures: errorMeasuresMock }),
  }),
}));

vi.mock("@/lib/logMonitor/GetLogMonitor", () => ({
  getLogMonitor: () => ({
    createConnection: () => CONNECTION,
    createStrategy: () => ({ getKpiMeasures: logMeasuresMock }),
  }),
}));

vi.mock("@/lib/trackerMonitor/GetTrackerMonitor", () => ({
  getTrackerMonitor: () => ({
    createConnection: () => ({ baseUrl: "https://ph", projectId: "ph-project" }),
    createStrategy: () => ({ getKpiMeasures: trackerMeasuresMock }),
  }),
}));

import { KpisDataAccess } from "@/app/features/kpis/data-access/KpisDataAccess";
import { DASHBOARD_KPI } from "@/lib/config/domain/loadToolWiring";

const LOG_WIRING = glitchtipWiring({
  strategy: {
    kind: "log-monitor",
    id: "s2",
    tags: [
      { id: "t1", name: "reservation", value: "reservation.sent", description: null, color: null },
    ],
  },
});

describe("KpisDataAccess.getMeasure", () => {
  beforeEach(() => {
    loadToolWiringMock.mockReset();
    createErrorConnectionMock.mockClear();
    errorMeasuresMock.mockReset();
    logMeasuresMock.mockReset();
    trackerMeasuresMock.mockReset();
    errorMeasuresMock.mockResolvedValue({ value: 0, windowMinutes: null });
    logMeasuresMock.mockResolvedValue({ value: 0, windowMinutes: null });
    trackerMeasuresMock.mockResolvedValue({ value: 0, windowMinutes: null });
  });

  it("loads the wiring of the element it was given", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());

    await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-42", 30);

    expect(loadToolWiringMock).toHaveBeenCalledWith(DASHBOARD_KPI, "kpi-42");
  });

  it("connects from the wiring the factory already holds", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());

    await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-1", 30);

    expect(createErrorConnectionMock).toHaveBeenCalledWith();
  });

  it("hands the window and the environment to the strategy", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());

    await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-1", 30, "production");

    expect(errorMeasuresMock).toHaveBeenCalledWith(30, "production");
  });

  it("defaults the environment to null rather than inventing one", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());

    await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-1", 30);

    expect(errorMeasuresMock).toHaveBeenCalledWith(30, null);
  });

  // A KPI whose Strapi `type` is not `interval` measures a total: the route
  // sends no window at all, and the data-access must not fall back to one.
  it("passes a null window straight through", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());

    await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-1", null);

    expect(errorMeasuresMock).toHaveBeenCalledWith(null, null);
  });

  it("returns the measure the strategy built, untouched", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());
    errorMeasuresMock.mockResolvedValue({ value: 11, windowMinutes: 30 });

    const measure = await new KpisDataAccess().getMeasure(
      DASHBOARD_KPI,
      "kpi-1",
      30,
    );

    expect(measure).toEqual({ value: 11, windowMinutes: 30 });
  });

  // The strategy kind is what picks the family; asserting all three here is
  // what keeps a new strategy from silently resolving the error monitor.
  describe("picks the family the strategy names", () => {
    it("routes an error-monitor element to the error monitor", async () => {
      loadToolWiringMock.mockResolvedValue(glitchtipWiring());

      await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-1", 30);

      expect(errorMeasuresMock).toHaveBeenCalledTimes(1);
      expect(logMeasuresMock).not.toHaveBeenCalled();
      expect(trackerMeasuresMock).not.toHaveBeenCalled();
    });

    it("routes a log-monitor element to the log monitor", async () => {
      loadToolWiringMock.mockResolvedValue(LOG_WIRING);

      await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-2", 15);

      expect(logMeasuresMock).toHaveBeenCalledWith(15, null);
      expect(errorMeasuresMock).not.toHaveBeenCalled();
    });

    it("routes a tracker-monitor element to the tracker monitor", async () => {
      loadToolWiringMock.mockResolvedValue(posthogWiring());

      await new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-3", 60);

      expect(trackerMeasuresMock).toHaveBeenCalledWith(60, null);
      expect(errorMeasuresMock).not.toHaveBeenCalled();
    });
  });

  it("throws rather than measuring when the element declares no strategy", async () => {
    loadToolWiringMock.mockResolvedValue(
      glitchtipWiring({ id: "kpi-9", strategy: undefined }),
    );

    await expect(
      new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-9", 30),
    ).rejects.toThrow(/declares no strategy/);
    expect(errorMeasuresMock).not.toHaveBeenCalled();
  });

  it("lets a provider failure bubble up — the route turns it into a 502", async () => {
    loadToolWiringMock.mockResolvedValue(glitchtipWiring());
    errorMeasuresMock.mockRejectedValue(new Error("GlitchTip API error 502"));

    await expect(
      new KpisDataAccess().getMeasure(DASHBOARD_KPI, "kpi-1", 30),
    ).rejects.toThrow(/502/);
  });
});
