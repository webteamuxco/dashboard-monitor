import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchVisitorsTimelineClient } from "@/app/features/visitors/data-access/fetchVisitorsTimelineClient";
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

describe("fetchVisitorsTimelineClient", () => {
  it("calls /api/visitors/timeline with the panel documentId and the window", async () => {
    const fetchMock = mockOk([]);

    await fetchVisitorsTimelineClient("panel-1", 60);

    expect(calledUrl(fetchMock)).toContain("/api/visitors/timeline?");
    expect(calledParams(fetchMock)).toEqual({
      documentId: "panel-1",
      windowMinutes: "60",
    });
    expect(calledInit(fetchMock)).toMatchObject({ cache: "no-store" });
  });

  it("takes no environment — the tracker timeline is not environment-scoped", async () => {
    const fetchMock = mockOk([]);

    await fetchVisitorsTimelineClient("panel-1", 60);

    expect(calledParams(fetchMock)).not.toHaveProperty("environment");
  });

  it("unwraps the new/returning split", async () => {
    mockOk([
      {
        minuteIso: "2026-09-02T10:00:00Z",
        label: "10:00",
        newCount: 3,
        returningCount: 7,
      },
    ]);

    await expect(fetchVisitorsTimelineClient("panel-1", 60)).resolves.toEqual([
      {
        minuteIso: "2026-09-02T10:00:00Z",
        label: "10:00",
        newCount: 3,
        returningCount: 7,
      },
    ]);
  });

  it("throws the BFF error message on failure", async () => {
    mockError(502, "PostHog request failed: 401");

    await expect(fetchVisitorsTimelineClient("panel-1", 60)).rejects.toThrow(
      "PostHog request failed: 401",
    );
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(502);

    await expect(fetchVisitorsTimelineClient("panel-1", 60)).rejects.toThrow(
      "Request failed with status 502",
    );
  });
});
