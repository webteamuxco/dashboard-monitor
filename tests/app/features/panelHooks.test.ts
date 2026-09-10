// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";

const { fetchErrorRateClientMock, fetchVisitorsTimelineClientMock } = vi.hoisted(
  () => ({
    fetchErrorRateClientMock: vi.fn(),
    fetchVisitorsTimelineClientMock: vi.fn(),
  }),
);

vi.mock("@/app/features/errorRate/data-access/fetchErrorRateClient", () => ({
  fetchErrorRateClient: fetchErrorRateClientMock,
}));
vi.mock(
  "@/app/features/visitors/data-access/fetchVisitorsTimelineClient",
  () => ({ fetchVisitorsTimelineClient: fetchVisitorsTimelineClientMock }),
);

import { useErrorRate } from "@/app/features/errorRate/hooks/useErrorRate";
import { useVisitorsTimeline } from "@/app/features/visitors/hooks/useVisitorsTimeline";
import { renderQueryHook } from "../../helpers/renderHook";

beforeEach(() => {
  fetchErrorRateClientMock.mockReset();
  fetchVisitorsTimelineClientMock.mockReset();
});

describe("useErrorRate", () => {
  it("fetches with the panel documentId and the environment", async () => {
    fetchErrorRateClientMock.mockResolvedValue([{ bucketEpoch: 1 }]);

    const { result } = renderQueryHook(
      () => useErrorRate("panel-1", "staging", 30_000),
      undefined,
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ bucketEpoch: 1 }]),
    );
    expect(fetchErrorRateClientMock).toHaveBeenCalledWith("panel-1", "staging");
  });

  it("refetches when the environment changes", async () => {
    fetchErrorRateClientMock.mockImplementation(
      async (_id: string, environment: string | null) => [{ environment }],
    );

    const { result, rerender } = renderQueryHook(
      (environment: string | null) => useErrorRate("panel-1", environment, 30_000),
      "production",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ environment: "production" }]),
    );

    rerender(null);

    await waitFor(() =>
      expect(result.current.data).toEqual([{ environment: null }]),
    );
  });

  it("surfaces the BFF error", async () => {
    fetchErrorRateClientMock.mockRejectedValue(new Error("stats_v2 failed"));

    const { result } = renderQueryHook(
      () => useErrorRate("panel-1", null, 30_000),
      undefined,
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
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
