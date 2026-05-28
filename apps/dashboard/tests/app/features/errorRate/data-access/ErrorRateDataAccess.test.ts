import { describe, it, expect, vi, beforeEach } from "vitest";

const getErrorStatsMock = vi.fn();

vi.mock("@/lib/errorMonitor/GetErrorMonitor", () => ({
  getErrorMonitor: () => ({
    getErrorStats: getErrorStatsMock,
    getIssues: vi.fn(),
    getIssue: vi.fn(),
    getIssueLatestEvent: vi.fn(),
    getIssueEvents: vi.fn(),
    getIssueComments: vi.fn(),
  }),
}));

import { ErrorRateDataAccess } from "@/app/features/errorRate/data-access/ErrorRateDataAccess";

describe("ErrorRateDataAccess.getSeries", () => {
  beforeEach(() => {
    getErrorStatsMock.mockReset();
  });

  it("calls getErrorMonitor.getErrorStats with a 1h interval over the past 24h", async () => {
    getErrorStatsMock.mockResolvedValue([]);
    const da = new ErrorRateDataAccess();

    await da.getSeries("proj-1");

    expect(getErrorStatsMock).toHaveBeenCalledTimes(1);
    const [projectId, period] = getErrorStatsMock.mock.calls[0];
    expect(projectId).toBe("proj-1");
    expect(period.interval).toBe("1h");

    const span = new Date(period.to).getTime() - new Date(period.from).getTime();
    expect(span).toBe(24 * 60 * 60 * 1000);
  });

  it("maps each TimeSeriesPoint to ErrorRatePoint with bucketEpoch + French hour label", async () => {
    getErrorStatsMock.mockResolvedValue([
      { timestamp: "2026-05-28T08:00:00Z", count: 5 },
      { timestamp: "2026-05-28T09:00:00Z", count: 0 },
    ]);
    const da = new ErrorRateDataAccess();

    const out = await da.getSeries("p");

    expect(out).toHaveLength(2);
    expect(out[0].bucketEpoch).toBe(new Date("2026-05-28T08:00:00Z").getTime());
    expect(out[0].count).toBe(5);
    expect(out[0].label).toMatch(/^\d{2}h$/);
  });

  it("preserves a null count without coercing it", async () => {
    getErrorStatsMock.mockResolvedValue([
      { timestamp: "2026-05-28T08:00:00Z", count: null as unknown as number },
    ]);
    const da = new ErrorRateDataAccess();

    const out = await da.getSeries("p");

    expect(out[0].count).toBeNull();
  });

  it("returns an empty array when the monitor returns no points", async () => {
    getErrorStatsMock.mockResolvedValue([]);
    const da = new ErrorRateDataAccess();

    expect(await da.getSeries("p")).toEqual([]);
  });
});
