import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchReservationsClient } from "@/app/features/reservations/data-access/fetchReservationsClient";
import {
  calledInit,
  calledParams,
  calledUrl,
  mockError,
  mockOk,
  mockUnparseableError,
} from "../../../../helpers/fetchMock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchReservationsClient", () => {
  it("calls /api/reservations with the panel documentId and the window", async () => {
    const fetchMock = mockOk([]);

    await fetchReservationsClient("panel-1", 30);

    expect(calledUrl(fetchMock)).toContain("/api/reservations?");
    expect(calledParams(fetchMock)).toEqual({
      documentId: "panel-1",
      windowMinutes: "30",
    });
    expect(calledInit(fetchMock)).toMatchObject({ cache: "no-store" });
  });

  it("adds the environment only when one is selected", async () => {
    const fetchMock = mockOk([]);

    await fetchReservationsClient("panel-1", 30, "production");
    expect(calledParams(fetchMock)).toMatchObject({ environment: "production" });

    await fetchReservationsClient("panel-1", 30, null);
    expect(calledParams(fetchMock)).not.toHaveProperty("environment");
  });

  it("unwraps the series", async () => {
    mockOk([{ minuteIso: "2026-09-02T10:00:00Z", label: "10:00", count: 2 }]);

    await expect(fetchReservationsClient("panel-1", 30)).resolves.toEqual([
      { minuteIso: "2026-09-02T10:00:00Z", label: "10:00", count: 2 },
    ]);
  });

  it("throws the BFF error message on failure", async () => {
    mockError(502, 'No LogMonitorFactory supports type "log-monitor"');

    await expect(fetchReservationsClient("panel-1", 30)).rejects.toThrow(
      'No LogMonitorFactory supports type "log-monitor"',
    );
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(500);

    await expect(fetchReservationsClient("panel-1", 30)).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});
