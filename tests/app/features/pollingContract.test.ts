// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";

const { fetchBlockMeasureClientMock, fetchKpiMeasureClientMock } = vi.hoisted(
  () => ({
    fetchBlockMeasureClientMock: vi.fn(),
    fetchKpiMeasureClientMock: vi.fn(),
  }),
);

vi.mock("@/app/features/blocks/data-access/fetchBlockMeasureClient", () => ({
  fetchBlockMeasureClient: fetchBlockMeasureClientMock,
}));
vi.mock("@/app/features/kpis/data-access/fetchKpiMeasureClient", () => ({
  fetchKpiMeasureClient: fetchKpiMeasureClientMock,
}));

import { useBlock } from "@/app/features/blocks/hooks/useBlock";
import { useKpi } from "@/app/features/kpis/hooks/useKpi";
import { dashboardBlockKeys } from "@/app/features/blocks/queryKeys";
import { dashboardKpiKeys } from "@/app/features/kpis/queryKeys";
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
