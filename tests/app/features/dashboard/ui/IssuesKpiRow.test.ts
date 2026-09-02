// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import type { StrategiesKey } from "@/lib/shared/strategiesEnum";

// The cards themselves render provider data through their own hooks; here only
// the strategy gating matters.
vi.mock("@/app/features/issues/ui/IssuesKpi", () => ({
  IssueKpi: () => createElement("div", { "data-testid": "issue-kpi" }),
}));
vi.mock("@/app/features/visitors/ui/VisitorsKpi", () => ({
  VisitorsKpi: () => createElement("div", { "data-testid": "visitors-kpi" }),
}));
vi.mock("@/app/features/reservations/ui/ReservationsKpiCard", () => ({
  ReservationsKpiCard: () =>
    createElement("div", { "data-testid": "reservations-kpi" }),
}));

import { KpiRow } from "@/app/features/dashboard/ui/IssuesKpiRow";

function renderRow(strategies?: StrategiesKey[]) {
  return render(
    createElement(KpiRow, {
      documentId: "panel-1",
      limit: 20,
      intervalMs: 30_000,
      strategies,
    }),
  );
}

describe("KpiRow", () => {
  it("shows the issues card for error-monitor", () => {
    renderRow(["error-monitor"]);

    expect(screen.getByTestId("issue-kpi")).toBeDefined();
    expect(screen.queryByTestId("visitors-kpi")).toBeNull();
    expect(screen.queryByTestId("reservations-kpi")).toBeNull();
  });

  it("shows the visitors card for tracker-monitor", () => {
    renderRow(["tracker-monitor"]);

    expect(screen.getByTestId("visitors-kpi")).toBeDefined();
    expect(screen.queryByTestId("issue-kpi")).toBeNull();
  });

  it("shows the reservations card for log-monitor", () => {
    renderRow(["log-monitor"]);

    expect(screen.getByTestId("reservations-kpi")).toBeDefined();
    expect(screen.queryByTestId("issue-kpi")).toBeNull();
  });

  it("shows every card when the panel maps all three strategies", () => {
    renderRow(["error-monitor", "log-monitor", "tracker-monitor"]);

    expect(screen.getByTestId("issue-kpi")).toBeDefined();
    expect(screen.getByTestId("visitors-kpi")).toBeDefined();
    expect(screen.getByTestId("reservations-kpi")).toBeDefined();
  });

  it("shows nothing while the strategy list is unknown", () => {
    renderRow(undefined);

    expect(screen.queryByTestId("issue-kpi")).toBeNull();
    expect(screen.queryByTestId("visitors-kpi")).toBeNull();
    expect(screen.queryByTestId("reservations-kpi")).toBeNull();
  });

  it("shows nothing when the panel maps no strategy", () => {
    renderRow([]);

    expect(screen.queryByTestId("issue-kpi")).toBeNull();
  });
});
