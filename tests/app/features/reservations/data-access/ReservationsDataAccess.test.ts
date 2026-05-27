import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getLogsMock = vi.fn();

vi.mock("@/lib/logMonitor/GetLogMonitor", () => ({
  getLogMonitor: () => ({ getLogs: getLogsMock }),
}));

import { ReservationsDataAccess } from "@/app/features/reservations/data-access/ReservationsDataAccess";

const FIXED_NOW = new Date("2026-05-28T08:30:45.000Z");

describe("ReservationsDataAccess.getSeries", () => {
  beforeEach(() => {
    getLogsMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests logs with the 'reservation.sent' query and a windowMinutes-wide period", async () => {
    getLogsMock.mockResolvedValue([]);
    const da = new ReservationsDataAccess();

    await da.getSeries("p1", 5);

    expect(getLogsMock).toHaveBeenCalledTimes(1);
    const [projectId, filters, period] = getLogsMock.mock.calls[0];
    expect(projectId).toBe("p1");
    expect(filters).toEqual({ query: "reservation.sent" });
    expect(period.interval).toBe("1m");

    const span = new Date(period.to).getTime() - new Date(period.from).getTime();
    expect(span).toBe(5 * 60 * 1000);
  });

  it("returns a zero-filled series of length windowMinutes when no logs", async () => {
    getLogsMock.mockResolvedValue([]);
    const da = new ReservationsDataAccess();

    const out = await da.getSeries("p", 5);

    expect(out).toHaveLength(5);
    expect(out.every((p) => p.count === 0)).toBe(true);
  });

  it("aligns the last bucket on the current minute (UTC)", async () => {
    getLogsMock.mockResolvedValue([]);
    const da = new ReservationsDataAccess();

    const out = await da.getSeries("p", 5);

    expect(out[4].minuteIso).toBe("2026-05-28T08:30:00.000Z");
    expect(out[0].minuteIso).toBe("2026-05-28T08:26:00.000Z");
  });

  it("aggregates logs into the matching minute bucket", async () => {
    getLogsMock.mockResolvedValue([
      { id: "l1", message: "", level: "info", timestamp: "2026-05-28T08:30:00Z" },
      { id: "l2", message: "", level: "info", timestamp: "2026-05-28T08:30:30Z" },
      { id: "l3", message: "", level: "info", timestamp: "2026-05-28T08:28:00Z" },
    ]);
    const da = new ReservationsDataAccess();

    const out = await da.getSeries("p", 5);

    expect(out[4].count).toBe(2);
    expect(out[2].count).toBe(1);
    expect(out[0].count).toBe(0);
  });

  it("ignores logs that fall outside the configured window", async () => {
    getLogsMock.mockResolvedValue([
      { id: "old", message: "", level: "info", timestamp: "2026-05-28T07:00:00Z" },
      { id: "new", message: "", level: "info", timestamp: "2026-05-28T08:30:00Z" },
    ]);
    const da = new ReservationsDataAccess();

    const out = await da.getSeries("p", 5);

    expect(out.reduce((acc, p) => acc + p.count, 0)).toBe(1);
  });
});
