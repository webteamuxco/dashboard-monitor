import { describe, it, expect, vi, beforeEach } from "vitest";

import { glitchtipWiring } from "../../../../helpers/toolWiring";

// vi.mock is hoisted above every const, so the mock function it reads
// has to be hoisted with it.
const { loadToolWiringMock } = vi.hoisted(() => ({
  loadToolWiringMock: vi.fn(),
}));

const WIRING = glitchtipWiring();

const getErrorStatsMock = vi.fn();
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
      getErrorStats: getErrorStatsMock,
      getIssues: vi.fn(),
      getIssue: vi.fn(),
      getIssueLatestEvent: vi.fn(),
      getIssueEvents: vi.fn(),
      getIssueComments: vi.fn(),
    }),
  }),
}));

import { ErrorRateDataAccess } from "@/app/features/errorRate/data-access/ErrorRateDataAccess";
import { DASHBOARD_KPI } from "@/lib/config/domain/loadToolWiring";

describe("ErrorRateDataAccess.getSeries", () => {
  beforeEach(() => {
    getErrorStatsMock.mockReset();
    loadToolWiringMock.mockReset();
    loadToolWiringMock.mockResolvedValue(WIRING);
  });

  it("calls getErrorStats with a 1h interval over the past 24h", async () => {
    getErrorStatsMock.mockResolvedValue({ interval: "1h", points: [] });
    const da = new ErrorRateDataAccess();

    await da.getSeries(DASHBOARD_KPI, "proj-1");

    expect(getErrorStatsMock).toHaveBeenCalledTimes(1);
    const [projectId, period] = getErrorStatsMock.mock.calls[0];
    expect(projectId).toBe("gt-project");
    expect(period.interval).toBe("1h");

    const span = new Date(period.to).getTime() - new Date(period.from).getTime();
    expect(span).toBe(24 * 60 * 60 * 1000);
  });

  it("forwards the environment to getErrorStats when provided", async () => {
    getErrorStatsMock.mockResolvedValue({ interval: "1h", points: [] });

    await new ErrorRateDataAccess().getSeries(DASHBOARD_KPI, "proj-1", "staging");

    expect(getErrorStatsMock.mock.calls[0][2]).toBe("staging");
  });

  it("maps each TimeSeriesPoint to ErrorRatePoint with bucketEpoch + French hour label", async () => {
    getErrorStatsMock.mockResolvedValue({
      interval: "1h",
      points: [
        { timestamp: "2026-05-28T08:00:00Z", count: 5 },
        { timestamp: "2026-05-28T09:00:00Z", count: 0 },
      ],
    });
    const da = new ErrorRateDataAccess();

    const out = await da.getSeries(DASHBOARD_KPI, "p");

    expect(out).toHaveLength(2);
    expect(out[0].bucketEpoch).toBe(new Date("2026-05-28T08:00:00Z").getTime());
    expect(out[0].count).toBe(5);
    expect(out[0].label).toMatch(/^\d{2}h$/);
  });

  it("preserves a null count without coercing it", async () => {
    getErrorStatsMock.mockResolvedValue({
      interval: "1h",
      points: [
        { timestamp: "2026-05-28T08:00:00Z", count: null as unknown as number },
      ],
    });
    const da = new ErrorRateDataAccess();

    const out = await da.getSeries(DASHBOARD_KPI, "p");

    expect(out[0].count).toBeNull();
  });

  it("returns an empty array when the monitor returns no points", async () => {
    getErrorStatsMock.mockResolvedValue({ interval: "1h", points: [] });
    const da = new ErrorRateDataAccess();

    expect(await da.getSeries(DASHBOARD_KPI, "p")).toEqual([]);
  });
});
