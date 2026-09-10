// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { screen, waitFor } from "@testing-library/react";
import type { DashboardKpi } from "@/lib/config/domain/DashboardKpi";
import type { DashboardBlock } from "@/lib/config/domain/DashboardBlock";

const { fetchDashboardKpisClientMock, fetchDashboardBlockClientMock } =
  vi.hoisted(() => ({
    fetchDashboardKpisClientMock: vi.fn(),
    fetchDashboardBlockClientMock: vi.fn(),
  }));

vi.mock("@/app/features/kpis/data-access/fetchDashboardKpisClient", () => ({
  fetchDashboardKpisClient: fetchDashboardKpisClientMock,
}));
vi.mock("@/app/features/blocks/data-access/fetchDashboardBlockClient", () => ({
  fetchDashboardBlockClient: fetchDashboardBlockClientMock,
}));

// Each card has its own tests; here only the composition matters, so both are
// reduced to a marker carrying the element they were handed.
vi.mock("@/app/features/kpis/ui/KpiCard", () => ({
  KpiCard: ({ dashboardKpi }: { dashboardKpi: DashboardKpi }) =>
    createElement("div", {
      "data-testid": "kpi-card",
      "data-slug": dashboardKpi.slug,
    }),
}));
vi.mock("@/app/features/blocks/ui/BlockCard", () => ({
  BlockCard: ({ dashboardBlock }: { dashboardBlock: DashboardBlock }) =>
    createElement("div", {
      "data-testid": "block-card",
      "data-slug": dashboardBlock.slug,
    }),
}));

import { PanelKpi } from "@/app/features/components/panel/panelKpi";
import { PanelBlock } from "@/app/features/components/panel/panelBlock";
import { renderWithQuery } from "../../../helpers/renderHook";

function kpi(slug: string, order: number): DashboardKpi {
  return {
    id: `kpi-${slug}`,
    slug,
    name: slug,
    title: slug,
    description: "",
    icon: "activity",
    level: "info",
    order,
    type: "interval",
  };
}

function block(slug: string, order: number): DashboardBlock {
  return {
    id: `block-${slug}`,
    slug,
    name: slug,
    title: slug,
    description: "",
    icon: "activity",
    level: "info",
    order,
    type: "bar",
  };
}

function slugsOf(testId: string): string[] {
  return screen
    .getAllByTestId(testId)
    .map((node) => node.getAttribute("data-slug") ?? "");
}

describe("PanelKpi", () => {
  beforeEach(() => {
    fetchDashboardKpisClientMock.mockReset();
  });

  it("mounts one card per KPI of the panel, in the order Strapi returned", async () => {
    fetchDashboardKpisClientMock.mockResolvedValue([
      kpi("open-issues", 0),
      kpi("new-issues", 1),
    ]);

    renderWithQuery(
      createElement(PanelKpi, { panelSlug: "production", intervalMs: 0 }),
    );

    await waitFor(() =>
      expect(slugsOf("kpi-card")).toEqual(["open-issues", "new-issues"]),
    );
    expect(fetchDashboardKpisClientMock).toHaveBeenCalledWith("production");
  });

  it("renders nothing — and asks nothing — without a panel", () => {
    renderWithQuery(
      createElement(PanelKpi, { panelSlug: null, intervalMs: 0 }),
    );

    expect(screen.queryByTestId("kpi-card")).toBeNull();
    // An empty panelSlug builds an empty GraphQL filter, which matches every
    // KPI of the whole Strapi instance.
    expect(fetchDashboardKpisClientMock).not.toHaveBeenCalled();
  });

  it("renders an empty strip when the panel declares no KPI", async () => {
    fetchDashboardKpisClientMock.mockResolvedValue([]);

    renderWithQuery(
      createElement(PanelKpi, { panelSlug: "production", intervalMs: 0 }),
    );

    await waitFor(() => expect(fetchDashboardKpisClientMock).toHaveBeenCalled());
    expect(screen.queryByTestId("kpi-card")).toBeNull();
    expect(screen.queryByText(/Erreur de chargement/)).toBeNull();
  });
});

describe("PanelBlock", () => {
  beforeEach(() => {
    fetchDashboardBlockClientMock.mockReset();
  });

  it("mounts one card per block of the panel", async () => {
    fetchDashboardBlockClientMock.mockResolvedValue([
      block("error-list", 0),
      block("error-rate", 1),
      block("reservations", 2),
    ]);

    renderWithQuery(
      createElement(PanelBlock, {
        panelSlug: "production",
        limit: 20,
        intervalMs: 0,
      }),
    );

    await waitFor(() =>
      expect(slugsOf("block-card")).toHaveLength(3),
    );
    expect(fetchDashboardBlockClientMock).toHaveBeenCalledWith("production");
  });

  it("splits the blocks into two columns on the parity of their order", async () => {
    fetchDashboardBlockClientMock.mockResolvedValue([
      block("even", 0),
      block("odd", 1),
    ]);

    const { container } = renderWithQuery(
      createElement(PanelBlock, {
        panelSlug: "production",
        limit: 20,
        intervalMs: 0,
      }),
    );

    await waitFor(() => expect(slugsOf("block-card")).toHaveLength(2));
    expect(container.querySelectorAll(".BlockColumn")).toHaveLength(2);
  });

  it("keeps a single column when every block falls on the same parity", async () => {
    fetchDashboardBlockClientMock.mockResolvedValue([
      block("first", 0),
      block("second", 2),
    ]);

    const { container } = renderWithQuery(
      createElement(PanelBlock, {
        panelSlug: "production",
        limit: 20,
        intervalMs: 0,
      }),
    );

    await waitFor(() => expect(slugsOf("block-card")).toHaveLength(2));
    expect(container.querySelectorAll(".BlockColumn")).toHaveLength(1);
  });

  it("renders nothing — and asks nothing — without a panel", () => {
    renderWithQuery(
      createElement(PanelBlock, {
        panelSlug: null,
        limit: 20,
        intervalMs: 0,
      }),
    );

    expect(screen.queryByTestId("block-card")).toBeNull();
    expect(fetchDashboardBlockClientMock).not.toHaveBeenCalled();
  });

  it("surfaces a failing element list", async () => {
    fetchDashboardBlockClientMock.mockRejectedValue(new Error("Strapi is down"));

    renderWithQuery(
      createElement(PanelBlock, {
        panelSlug: "production",
        limit: 20,
        intervalMs: 0,
      }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Strapi is down/)).toBeDefined(),
    );
  });
});
