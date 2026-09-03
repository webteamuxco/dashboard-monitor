import { describe, it, expect, vi, beforeEach } from "vitest";

const getErrorStatsMock = vi.fn();
const createConnectionMock = vi.fn(async () => ({
  baseUrl: "https://gt",
  organizationSlug: "org",
  projectId: "gt-project",
}));

vi.mock("@/lib/errorMonitor/GetErrorMonitor", () => ({
  getErrorMonitorFactory: async () => ({
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

describe("ErrorRateDataAccess.getSeries", () => {
  beforeEach(() => {
    getErrorStatsMock.mockReset();
  });

  it("calls getErrorStats with a 1h interval over the past 24h", async () => {
    getErrorStatsMock.mockResolvedValue({ points: [], truncated: false });
    const da = new ErrorRateDataAccess();

    await da.getSeries("proj-1");

    expect(getErrorStatsMock).toHaveBeenCalledTimes(1);
    const [projectId, period] = getErrorStatsMock.mock.calls[0];
    expect(projectId).toBe("gt-project");
    expect(period.interval).toBe("1h");

    const span = new Date(period.to).getTime() - new Date(period.from).getTime();
    expect(span).toBe(24 * 60 * 60 * 1000);
  });

  it("forwards the environment to getErrorStats when provided", async () => {
    getErrorStatsMock.mockResolvedValue({ points: [], truncated: false });

    await new ErrorRateDataAccess().getSeries("proj-1", "staging");

    expect(getErrorStatsMock.mock.calls[0][2]).toBe("staging");
  });

  it("maps each TimeSeriesPoint to ErrorRatePoint with bucketEpoch + French hour label", async () => {
    getErrorStatsMock.mockResolvedValue({
      points: [
        { timestamp: "2026-05-28T08:00:00Z", count: 5 },
        { timestamp: "2026-05-28T09:00:00Z", count: 0 },
      ],
      truncated: false,
    });
    const da = new ErrorRateDataAccess();

    const out = await da.getSeries("p");

    expect(out.points).toHaveLength(2);
    expect(out.points[0].bucketEpoch).toBe(new Date("2026-05-28T08:00:00Z").getTime());
    expect(out.points[0].count).toBe(5);
    expect(out.points[0].label).toMatch(/^\d{2}h$/);
  });

  it("carries the monitor's truncation flag through to the view model", async () => {
    // A silently shortened error rate reads as an improvement — the panel has
    // to be able to say the chart is a floor.
    getErrorStatsMock.mockResolvedValue({
      points: [{ timestamp: "2026-05-28T08:00:00Z", count: 5 }],
      truncated: true,
    });

    expect((await new ErrorRateDataAccess().getSeries("p")).truncated).toBe(true);
  });

  it("returns an empty, untruncated series when the monitor returns no points", async () => {
    getErrorStatsMock.mockResolvedValue({ points: [], truncated: false });
    const da = new ErrorRateDataAccess();

    expect(await da.getSeries("p")).toEqual({ points: [], truncated: false });
  });
});
