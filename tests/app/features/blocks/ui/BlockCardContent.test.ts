// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import type { DashboardBlock } from "@/lib/config/domain/DashboardBlock";
import type { BlockMeasure } from "@/app/features/blocks/domain/BlockMeasure";

function marker(testId: string) {
  return ({ blockId }: { blockId?: string }) =>
    createElement("div", { "data-testid": testId, "data-block-id": blockId });
}

vi.mock("@/app/features/blocks/ui/blockType/list/blockList", () => ({
  BlockList: marker("block-list"),
}));
vi.mock("@/app/features/blocks/ui/blockType/rate/blockRate", () => ({
  BlockRate: marker("block-rate"),
}));
vi.mock("@/app/features/blocks/ui/blockType/bar/blockBar", () => ({
  BlockBar: marker("block-bar"),
  StackedBlockBar: marker("block-stacked-bar"),
}));

import { BlockCardContent } from "@/app/features/blocks/ui/card/BlockCardContent";

const SERIES_MEASURE: BlockMeasure = {
  type: "series",
  windowMinutes: 30,
  interval: "1m",
  series: [
    {
      key: "count",
      label: "Occurrences",
      points: [{ bucketEpoch: 1_757_000_000_000, label: "08:00", count: 3 }],
    },
  ],
};

const LIST_MEASURE: BlockMeasure = {
  type: "list",
  hasDetail: false,
  windowMinutes: null,
  entries: [],
};

function block(overrides: Partial<DashboardBlock> = {}): DashboardBlock {
  return {
    id: "block-1",
    slug: "reservations",
    name: "reservations",
    title: "Réservations envoyées",
    description: "",
    icon: "calendar-check",
    level: "info",
    order: 1,
    type: "bar",
    ...overrides,
  };
}

function renderContent(
  dashboardBlock: DashboardBlock,
  data: BlockMeasure | undefined,
) {
  return render(
    createElement(BlockCardContent, {
      dashboardBlock,
      data,
      level: "info",
      isPending: false,
      isError: false,
      error: null,
    }),
  );
}

describe("BlockCardContent", () => {
  it("draws bars for a bar block, from the very same series payload a rate block reads", () => {
    renderContent(block({ type: "bar" }), SERIES_MEASURE);

    expect(screen.getByTestId("block-bar")).toBeDefined();
    expect(screen.queryByTestId("block-rate")).toBeNull();
  });

  it("draws stacked bars for a stackedBar block", () => {
    renderContent(block({ type: "stackedBar" }), SERIES_MEASURE);

    expect(screen.getByTestId("block-stacked-bar")).toBeDefined();
    expect(screen.queryByTestId("block-bar")).toBeNull();
  });

  it("draws an area for a rate block", () => {
    renderContent(block({ type: "rate" }), SERIES_MEASURE);

    expect(screen.getByTestId("block-rate")).toBeDefined();
  });

  it("draws rows for a list block, and hands the body the element documentId", () => {
    renderContent(block({ type: "list" }), LIST_MEASURE);

    expect(screen.getByTestId("block-list").getAttribute("data-block-id")).toBe(
      "block-1",
    );
  });

  it("says so loudly when the measure shape does not match the declared type", () => {
    renderContent(block({ type: "bar" }), LIST_MEASURE);

    expect(screen.queryByTestId("block-bar")).toBeNull();
    expect(screen.getByText(/attend une mesure/)).toBeDefined();
  });

  it("says so loudly when Strapi declares no type", () => {
    renderContent(block({ type: null }), SERIES_MEASURE);

    expect(screen.queryByTestId("block-bar")).toBeNull();
    expect(screen.getByText(/aucun type d’affichage/)).toBeDefined();
  });

  it("renders no body while the measure is pending", () => {
    render(
      createElement(BlockCardContent, {
        dashboardBlock: block(),
        data: undefined,
        level: "info" as const,
        isPending: true,
        isError: false,
        error: null,
      }),
    );

    expect(screen.queryByTestId("block-bar")).toBeNull();
    expect(screen.getByText("Chargement…")).toBeDefined();
  });

  it("surfaces the BFF error instead of an empty chart", () => {
    render(
      createElement(BlockCardContent, {
        dashboardBlock: block(),
        data: undefined,
        level: "info" as const,
        isPending: false,
        isError: true,
        error: new Error("glitchtip is down"),
      }),
    );

    expect(screen.getByText(/glitchtip is down/)).toBeDefined();
  });
});
