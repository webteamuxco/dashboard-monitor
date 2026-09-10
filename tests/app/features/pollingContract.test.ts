// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";

const {
  fetchBlockMeasureClientMock,
  fetchKpiMeasureClientMock,
  fetchErrorRateClientMock,
  fetchVisitorsTimelineClientMock,
} = vi.hoisted(() => ({
  fetchBlockMeasureClientMock: vi.fn(),
  fetchKpiMeasureClientMock: vi.fn(),
  fetchErrorRateClientMock: vi.fn(),
  fetchVisitorsTimelineClientMock: vi.fn(),
}));

vi.mock("@/app/features/blocks/data-access/fetchBlockMeasureClient", () => ({
  fetchBlockMeasureClient: fetchBlockMeasureClientMock,
}));
vi.mock("@/app/features/kpis/data-access/fetchKpiMeasureClient", () => ({
  fetchKpiMeasureClient: fetchKpiMeasureClientMock,
}));
vi.mock("@/app/features/errorRate/data-access/fetchErrorRateClient", () => ({
  fetchErrorRateClient: fetchErrorRateClientMock,
}));
vi.mock(
  "@/app/features/visitors/data-access/fetchVisitorsTimelineClient",
  () => ({ fetchVisitorsTimelineClient: fetchVisitorsTimelineClientMock }),
);

import { useBlock } from "@/app/features/blocks/hooks/useBlock";
import { useKpi } from "@/app/features/kpis/hooks/useKpi";
import { useErrorRate } from "@/app/features/errorRate/hooks/useErrorRate";
import { useVisitorsTimeline } from "@/app/features/visitors/hooks/useVisitorsTimeline";
import { dashboardBlockKeys } from "@/app/features/blocks/queryKeys";
import { dashboardKpiKeys } from "@/app/features/kpis/queryKeys";
import { errorRateKeys } from "@/app/features/errorRate/queryKeys";
import { visitorsKeys } from "@/app/features/visitors/queryKeys";
import {
  refetchIntervalOf,
  renderQueryHookWithClient,
} from "../../helpers/renderHook";

/**
 * The polling cadence always comes from the project's Strapi defaultConfig,
 * threaded down as a prop. `0` — a project that sets DefaultRefreshIntervalMS
 * to zero — must disable polling rather than hammer the provider.
 */
const CASES = [
  {
    name: "useBlock",
    render: (intervalMs: number) =>
      renderQueryHookWithClient(
        () => useBlock("block-1", 30, null, null, null, intervalMs),
        undefined,
      ),
    key: dashboardBlockKeys.measure("block-1", 30, null, null, null),
    mock: fetchBlockMeasureClientMock,
  },
  {
    name: "useKpi",
    render: (intervalMs: number) =>
      renderQueryHookWithClient(
        () => useKpi("kpi-1", 30, null, intervalMs),
        undefined,
      ),
    key: dashboardKpiKeys.measure("kpi-1", 30, null),
    mock: fetchKpiMeasureClientMock,
  },
  {
    name: "useErrorRate",
    render: (intervalMs: number) =>
      renderQueryHookWithClient(
        () => useErrorRate("panel-1", null, intervalMs),
        undefined,
      ),
    key: errorRateKeys.series("panel-1", null),
    mock: fetchErrorRateClientMock,
  },
  {
    name: "useVisitorsTimeline",
    render: (intervalMs: number) =>
      renderQueryHookWithClient(
        () => useVisitorsTimeline("panel-1", 60, intervalMs),
        undefined,
      ),
    key: visitorsKeys.timeline("panel-1", 60),
    mock: fetchVisitorsTimelineClientMock,
  },
];

describe("polling contract", () => {
  beforeEach(() => {
    for (const { mock } of CASES) {
      mock.mockReset();
      mock.mockResolvedValue([]);
    }
  });

  it.each(CASES)("$name polls on the given interval", async ({ render, key, mock }) => {
    const { client } = render(30_000);

    await waitFor(() => expect(mock).toHaveBeenCalled());
    expect(refetchIntervalOf(client, key)).toBe(30_000);
  });

  it.each(CASES)(
    "$name disables polling when the interval is 0",
    async ({ render, key, mock }) => {
      const { client } = render(0);

      await waitFor(() => expect(mock).toHaveBeenCalled());
      expect(refetchIntervalOf(client, key)).toBe(false);
    },
  );
});
