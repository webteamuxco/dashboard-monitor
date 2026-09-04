// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { screen, waitFor } from "@testing-library/react";
import type { DashboardPanel } from "@/lib/config/domain/DashboardPanels";
import type { Strategy } from "@/lib/config/domain/Strategy";

const {
  fetchProjectsClientMock,
  fetchProjectConfigClientMock,
  fetchProjectPanelsMock,
  fetchProjectStrategyMock,
} = vi.hoisted(() => ({
  fetchProjectsClientMock: vi.fn(),
  fetchProjectConfigClientMock: vi.fn(),
  fetchProjectPanelsMock: vi.fn(),
  fetchProjectStrategyMock: vi.fn(),
}));

vi.mock("@/app/features/config/data-access/fetchProjectsClient", () => ({
  fetchProjectsClient: fetchProjectsClientMock,
}));
vi.mock("@/app/features/config/data-access/fetchProjectConfigClient", () => ({
  fetchProjectConfigClient: fetchProjectConfigClientMock,
}));
vi.mock("@/app/features/config/data-access/fetchProjectPannels", () => ({
  fetchProjectPanels: fetchProjectPanelsMock,
}));
vi.mock("@/app/features/issues/data-access/fetchProjectStrategy", () => ({
  fetchProjectStrategy: fetchProjectStrategyMock,
}));

// The widgets themselves are covered by their own hooks' tests; here only the
// composition matters, so each one is reduced to a marker carrying its panel id.
function marker(testId: string) {
  return ({ documentId }: { documentId?: string }) =>
    createElement("div", { "data-testid": testId, "data-panel-id": documentId });
}

vi.mock("@/app/features/issues/ui/IssuesPanel", () => ({
  IssuesPanel: marker("issues-panel"),
}));
vi.mock("@/app/features/errorRate/ui/ErrorRatePanel", () => ({
  ErrorRatePanel: marker("error-rate-panel"),
}));
vi.mock("@/app/features/reservations/ui/ReservationsPanel", () => ({
  ReservationsPanel: marker("reservations-panel"),
}));
vi.mock("@/app/features/visitors/ui/VisitorsPanel", () => ({
  VisitorsPanel: marker("visitors-panel"),
}));
vi.mock("@/app/features/dashboard/ui/IssuesKpiRow", () => ({
  KpiRow: ({ strategies }: { strategies?: string[] }) =>
    createElement("div", {
      "data-testid": "kpi-row",
      "data-strategies": (strategies ?? []).join(","),
    }),
}));
vi.mock("@/app/features/dashboard/ui/DashboardHeader", () => ({
  DashboardHeader: ({ panelId }: { panelId: string }) =>
    createElement("header", { "data-testid": "header", "data-panel-id": panelId }),
}));

import { DashboardContent } from "@/app/features/dashboard/ui/DashboardContent";
import { useSelectedPanel } from "@/app/features/dashboard/state/useSelectedPanel";
import { useSelectedProject } from "@/app/features/dashboard/state/useSelectedProject";
import { useDashboardWindow } from "@/app/features/dashboard/state/useDashboardWindow";
import { renderWithQuery } from "../../../../helpers/renderHook";

const PANEL: DashboardPanel = {
  id: "panel-1",
  name: "production",
  slug: "production",
  displayName: "Production",
  icon: "activity",
  order: 1,
  isDevelopment: false,
};

function renderDashboard() {
  return renderWithQuery(
    createElement(DashboardContent, {
      initialDocumentId: "project-1",
      initialWindowPresets: [{ minutes: 15, label: "15m" }],
      initialWindowMinutes: 15,
      limit: 20,
      fallbackRefreshIntervalMs: 30_000,
    }),
  );
}

function mockStrategies(...names: string[]) {
  fetchProjectStrategyMock.mockResolvedValue(
    names.map((name) => ({ name }) as Strategy),
  );
}

describe("DashboardContent", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchProjectsClientMock.mockReset();
    fetchProjectConfigClientMock.mockReset();
    fetchProjectPanelsMock.mockReset();
    fetchProjectStrategyMock.mockReset();

    fetchProjectsClientMock.mockResolvedValue([
      {
        documentId: "project-1",
        title: "UXCO",
        slug: "uxco",
        publishedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    fetchProjectConfigClientMock.mockResolvedValue({
      documentId: "project-1",
      slug: "uxco",
    });
    fetchProjectPanelsMock.mockResolvedValue([PANEL]);

    useSelectedProject.setState({ documentId: null });
    useSelectedPanel.setState({
      pannelId: "",
      panelSlug: null,
      panelIcon: "panels-right-bottom",
    });
  });

  it("hydrates the window store from the server-resolved presets", () => {
    mockStrategies();

    renderDashboard();

    expect(useDashboardWindow.getState().presets).toEqual([
      { minutes: 15, label: "15m" },
    ]);
    expect(useDashboardWindow.getState().windowMinutes).toBe(15);
  });

  it("mounts the error-monitor widgets when the panel maps that strategy", async () => {
    mockStrategies("error-monitor");

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId("issues-panel")).toBeDefined());
    expect(screen.getByTestId("error-rate-panel")).toBeDefined();
    expect(screen.queryByTestId("reservations-panel")).toBeNull();
    expect(screen.queryByTestId("visitors-panel")).toBeNull();
  });

  it("mounts the reservations widget for log-monitor only", async () => {
    mockStrategies("log-monitor");

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId("reservations-panel")).toBeDefined(),
    );
    expect(screen.queryByTestId("issues-panel")).toBeNull();
    expect(screen.queryByTestId("error-rate-panel")).toBeNull();
  });

  it("mounts the visitors widget for tracker-monitor only", async () => {
    mockStrategies("tracker-monitor");

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId("visitors-panel")).toBeDefined(),
    );
    expect(screen.queryByTestId("issues-panel")).toBeNull();
  });

  it("mounts every widget when the panel maps all three strategies", async () => {
    mockStrategies("error-monitor", "log-monitor", "tracker-monitor");

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId("issues-panel")).toBeDefined());
    expect(screen.getByTestId("error-rate-panel")).toBeDefined();
    expect(screen.getByTestId("reservations-panel")).toBeDefined();
    expect(screen.getByTestId("visitors-panel")).toBeDefined();
  });

  it("mounts no widget when the panel maps nothing — an empty grid, not an error", async () => {
    fetchProjectStrategyMock.mockResolvedValue(null);

    renderDashboard();

    await waitFor(() => expect(fetchProjectStrategyMock).toHaveBeenCalled());
    expect(screen.queryByTestId("issues-panel")).toBeNull();
    expect(screen.queryByTestId("reservations-panel")).toBeNull();
    expect(screen.queryByTestId("visitors-panel")).toBeNull();
    expect(screen.queryByText(/Erreur de chargement/)).toBeNull();
  });

  it("passes the panel documentId — not the project's — to every widget", async () => {
    mockStrategies("error-monitor", "log-monitor", "tracker-monitor");

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId("issues-panel")).toBeDefined());
    for (const testId of [
      "issues-panel",
      "error-rate-panel",
      "reservations-panel",
      "visitors-panel",
      "header",
    ]) {
      expect(screen.getByTestId(testId).getAttribute("data-panel-id")).toBe(
        "panel-1",
      );
    }
  });

  it("forwards the strategy list to the KPI row", async () => {
    mockStrategies("error-monitor", "tracker-monitor");

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId("kpi-row").getAttribute("data-strategies")).toBe(
        "error-monitor,tracker-monitor",
      ),
    );
  });

  it("queries the strategies with the project id and the selected panel slug", async () => {
    mockStrategies("error-monitor");

    renderDashboard();

    await waitFor(() =>
      expect(fetchProjectStrategyMock).toHaveBeenCalledWith(
        "project-1",
        "production",
      ),
    );
  });

  it("renders the error state when the strategy query fails", async () => {
    fetchProjectStrategyMock.mockRejectedValue(new Error("Strapi is down"));

    renderDashboard();

    await waitFor(() =>
      expect(screen.getAllByText(/Erreur de chargement/).length).toBeGreaterThan(
        0,
      ),
    );
    expect(screen.getAllByText(/Strapi is down/).length).toBeGreaterThan(0);
  });

  it("resolves a panel even with no header selector — the read-only kiosk path", async () => {
    // Interactivity is off by default, so DashboardHeader renders no selector.
    // Resolution has to come from useActivePanel or nothing would mount.
    mockStrategies("error-monitor");

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId("issues-panel")).toBeDefined());
    expect(useSelectedPanel.getState().pannelId).toBe("panel-1");
  });
});
