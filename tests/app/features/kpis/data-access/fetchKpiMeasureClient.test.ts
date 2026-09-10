import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchKpiMeasureClient } from "@/app/features/kpis/data-access/fetchKpiMeasureClient";
import {
  mockOk,
  mockError,
  mockUnparseableError,
  calledUrl,
  calledParams,
  calledInit,
} from "../../../../helpers/fetchMock";

describe("fetchKpiMeasureClient", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the window of an interval KPI", async () => {
    const fetchMock = mockOk({ value: 7, windowMinutes: 30 });

    const measure = await fetchKpiMeasureClient("kpi-1", 30, "production");

    expect(measure).toEqual({ value: 7, windowMinutes: 30 });
    expect(calledUrl(fetchMock)).toContain("/api/kpis/kpi-1?");
    expect(calledParams(fetchMock)).toEqual({
      windowMinutes: "30",
      environment: "production",
    });
    expect(calledInit(fetchMock).cache).toBe("no-store");
  });

  // The route reads an absent param as "this KPI measures a total"; sending
  // `windowMinutes=null` or an empty value would be read as a bad request.
  it("omits the param entirely when the KPI carries no window", async () => {
    const fetchMock = mockOk({ value: 12, windowMinutes: null });

    await fetchKpiMeasureClient("kpi-1", null, null);

    expect(calledUrl(fetchMock)).toBe("/api/kpis/kpi-1");
  });

  it("keeps the environment when there is no window", async () => {
    const fetchMock = mockOk({ value: 12, windowMinutes: null });

    await fetchKpiMeasureClient("kpi-1", null, "staging");

    expect(calledParams(fetchMock)).toEqual({ environment: "staging" });
  });

  it("throws the BFF error message", async () => {
    mockError(502, "GlitchTip API error 500");

    await expect(fetchKpiMeasureClient("kpi-1", 30, null)).rejects.toThrow(
      "GlitchTip API error 500",
    );
  });

  it("falls back to the status when the body is not JSON", async () => {
    mockUnparseableError(500);

    await expect(fetchKpiMeasureClient("kpi-1", 30, null)).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});
