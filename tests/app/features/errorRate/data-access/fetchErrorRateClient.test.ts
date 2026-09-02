import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchErrorRateClient } from "@/app/features/errorRate/data-access/fetchErrorRateClient";
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

describe("fetchErrorRateClient", () => {
  it("calls /api/error-rate with the panel documentId", async () => {
    const fetchMock = mockOk([]);

    await fetchErrorRateClient("panel-1");

    expect(calledUrl(fetchMock)).toContain("/api/error-rate?");
    expect(calledParams(fetchMock)).toEqual({ documentId: "panel-1" });
    expect(calledInit(fetchMock)).toMatchObject({ cache: "no-store" });
  });

  it("adds the environment only when one is selected", async () => {
    const fetchMock = mockOk([]);

    await fetchErrorRateClient("panel-1", "staging");
    expect(calledParams(fetchMock)).toMatchObject({ environment: "staging" });

    await fetchErrorRateClient("panel-1", null);
    expect(calledParams(fetchMock)).not.toHaveProperty("environment");
  });

  it("preserves a null bucket count — a gap is not a zero", async () => {
    mockOk([
      { bucketEpoch: 1, label: "10:00", count: null },
      { bucketEpoch: 2, label: "11:00", count: 4 },
    ]);

    const series = await fetchErrorRateClient("panel-1");

    expect(series[0].count).toBeNull();
    expect(series[1].count).toBe(4);
  });

  it("throws the BFF error message on failure", async () => {
    mockError(502, "GlitchTip request failed: 403");

    await expect(fetchErrorRateClient("panel-1")).rejects.toThrow(
      "GlitchTip request failed: 403",
    );
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(504);

    await expect(fetchErrorRateClient("panel-1")).rejects.toThrow(
      "Request failed with status 504",
    );
  });
});
