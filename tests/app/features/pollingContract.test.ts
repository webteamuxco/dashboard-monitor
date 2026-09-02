// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";

const {
  fetchIssuesClientMock,
  fetchErrorRateClientMock,
  fetchReservationsClientMock,
  fetchVisitorsTimelineClientMock,
  fetchProjectStrategyMock,
} = vi.hoisted(() => ({
  fetchIssuesClientMock: vi.fn(),
  fetchErrorRateClientMock: vi.fn(),
  fetchReservationsClientMock: vi.fn(),
  fetchVisitorsTimelineClientMock: vi.fn(),
  fetchProjectStrategyMock: vi.fn(),
}));

vi.mock("@/app/features/issues/data-access/fetchIssuesClient", () => ({
  fetchIssuesClient: fetchIssuesClientMock,
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
vi.mock("@/app/features/issues/data-access/fetchProjectStrategy", () => ({
  fetchProjectStrategy: fetchProjectStrategyMock,
}));

import { useIssues } from "@/app/features/issues/hooks/useIssues";
import { useErrorRate } from "@/app/features/errorRate/hooks/useErrorRate";
import { useReservations } from "@/app/features/reservations/hooks/useReservations";
import { useVisitorsTimeline } from "@/app/features/visitors/hooks/useVisitorsTimeline";
import { useProjectStrategy } from "@/app/features/issues/hooks/useProjectStrategy";
import { issuesKeys } from "@/app/features/issues/queryKeys";
import { errorRateKeys } from "@/app/features/errorRate/queryKeys";
import { reservationsKeys } from "@/app/features/reservations/queryKeys";
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
    name: "useIssues",
    render: (intervalMs: number) =>
      renderQueryHookWithClient(
        () => useIssues("panel-1", 20, null, intervalMs),
        undefined,
      ),
    key: issuesKeys.recent("panel-1", 20, null),
    mock: fetchIssuesClientMock,
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
    name: "useReservations",
    render: (intervalMs: number) =>
      renderQueryHookWithClient(
        () => useReservations("panel-1", 30, null, intervalMs),
        undefined,
      ),
    key: reservationsKeys.series("panel-1", 30, null),
    mock: fetchReservationsClientMock,
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
  {
    name: "useProjectStrategy",
    render: (intervalMs: number) =>
      renderQueryHookWithClient(
        () => useProjectStrategy("project-1", "production", null, intervalMs),
        undefined,
      ),
    key: issuesKeys.isConfig("project-1", null, "production"),
    mock: fetchProjectStrategyMock,
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
