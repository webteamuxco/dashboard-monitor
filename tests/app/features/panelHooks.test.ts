// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";

const {
  fetchErrorRateClientMock,
  fetchReservationsClientMock,
  fetchVisitorsTimelineClientMock,
} = vi.hoisted(() => ({
  fetchErrorRateClientMock: vi.fn(),
  fetchReservationsClientMock: vi.fn(),
  fetchVisitorsTimelineClientMock: vi.fn(),
}));

vi.mock("@/app/features/errorRate/data-access/fetchErrorRateClient", () => ({
  fetchErrorRateClient: fetchErrorRateClientMock,
}));
vi.mock("@/app/features/reservations/data-access/fetchReservationsClient", () => ({
  fetchReservationsClient: fetchReservationsClientMock,
}));
vi.mock(
  "@/app/features/visitors/data-access/fetchVisitorsTimelineClient",
  () => ({ fetchVisitorsTimelineClient: fetchVisitorsTimelineClientMock }),
);

import { useErrorRate } from "@/app/features/errorRate/hooks/useErrorRate";
import { useReservations } from "@/app/features/reservations/hooks/useReservations";
import { useVisitorsTimeline } from "@/app/features/visitors/hooks/useVisitorsTimeline";
import { renderQueryHook } from "../../helpers/renderHook";

beforeEach(() => {
  fetchErrorRateClientMock.mockReset();
  fetchReservationsClientMock.mockReset();
  fetchVisitorsTimelineClientMock.mockReset();
});

describe("useErrorRate", () => {
  it("fetches with the panel documentId and the environment", async () => {
    fetchErrorRateClientMock.mockResolvedValue({
      points: [{ bucketEpoch: 1, label: "10h", count: 3 }],
      truncated: false,
    });

    const { result } = renderQueryHook(
      () => useErrorRate("panel-1", "staging", 30_000),
      undefined,
    );

    await waitFor(() =>
      expect(result.current.data).toEqual({
        points: [{ bucketEpoch: 1, label: "10h", count: 3 }],
        truncated: false,
      }),
    );
    expect(fetchErrorRateClientMock).toHaveBeenCalledWith("panel-1", "staging");
  });

  it("refetches when the environment changes", async () => {
    fetchErrorRateClientMock.mockImplementation(
      async (_id: string, environment: string | null) => ({
        points: [],
        truncated: false,
        environment,
      }),
    );

    const { result, rerender } = renderQueryHook(
      (environment: string | null) => useErrorRate("panel-1", environment, 30_000),
      "production",
    );

    await waitFor(() =>
      expect(result.current.data).toMatchObject({ environment: "production" }),
    );

    rerender(null);

    await waitFor(() =>
      expect(result.current.data).toMatchObject({ environment: null }),
    );
  });

  it("surfaces the BFF error", async () => {
    fetchErrorRateClientMock.mockRejectedValue(new Error("GlitchTip API error 502"));

    const { result } = renderQueryHook(
      () => useErrorRate("panel-1", null, 30_000),
      undefined,
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useReservations", () => {
  it("fetches with the panel documentId, the window and the environment", async () => {
    fetchReservationsClientMock.mockResolvedValue([{ count: 1 }]);

    const { result } = renderQueryHook(
      () => useReservations("panel-1", 30, "production", 30_000),
      undefined,
    );

    await waitFor(() => expect(result.current.data).toEqual([{ count: 1 }]));
    expect(fetchReservationsClientMock).toHaveBeenCalledWith(
      "panel-1",
      30,
      "production",
    );
  });

  it("refetches when the user picks another window preset", async () => {
    fetchReservationsClientMock.mockImplementation(
      async (_id: string, windowMinutes: number) => [{ windowMinutes }],
    );

    const { result, rerender } = renderQueryHook(
      (windowMinutes: number) =>
        useReservations("panel-1", windowMinutes, null, 30_000),
      30,
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ windowMinutes: 30 }]),
    );

    rerender(720);

    await waitFor(() =>
      expect(result.current.data).toEqual([{ windowMinutes: 720 }]),
    );
  });
});

describe("useVisitorsTimeline", () => {
  it("fetches with the panel documentId and the window", async () => {
    fetchVisitorsTimelineClientMock.mockResolvedValue([{ newCount: 2 }]);

    const { result } = renderQueryHook(
      () => useVisitorsTimeline("panel-1", 60, 30_000),
      undefined,
    );

    await waitFor(() => expect(result.current.data).toEqual([{ newCount: 2 }]));
    expect(fetchVisitorsTimelineClientMock).toHaveBeenCalledWith("panel-1", 60);
  });

  it("takes no environment — the timeline is not environment-scoped", async () => {
    fetchVisitorsTimelineClientMock.mockResolvedValue([]);

    renderQueryHook(() => useVisitorsTimeline("panel-1", 60, 30_000), undefined);

    await waitFor(() =>
      expect(fetchVisitorsTimelineClientMock).toHaveBeenCalledTimes(1),
    );
    expect(fetchVisitorsTimelineClientMock.mock.calls[0]).toHaveLength(2);
  });

  it("refetches when the panel changes", async () => {
    fetchVisitorsTimelineClientMock.mockImplementation(
      async (documentId: string) => [{ documentId }],
    );

    const { result, rerender } = renderQueryHook(
      (panelId: string) => useVisitorsTimeline(panelId, 60, 30_000),
      "panel-1",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ documentId: "panel-1" }]),
    );

    rerender("panel-2");

    await waitFor(() =>
      expect(result.current.data).toEqual([{ documentId: "panel-2" }]),
    );
  });
});
