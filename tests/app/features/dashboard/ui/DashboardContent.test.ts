// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { screen, waitFor } from "@testing-library/react";
import type { DashboardPanel } from "@/lib/config/domain/DashboardPanels";

const {
  fetchProjectsClientMock,
  fetchProjectConfigClientMock,
  fetchProjectPanelsMock,
} = vi.hoisted(() => ({
  fetchProjectsClientMock: vi.fn(),
  fetchProjectConfigClientMock: vi.fn(),
  fetchProjectPanelsMock: vi.fn(),
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

// The element lists have their own tests; here only the composition matters, so
// each one is reduced to a marker carrying the panel slug it was handed.
function marker(testId: string) {
  return ({ panelSlug }: { panelSlug: string | null }) =>
    createElement("div", {
      "data-testid": testId,
      "data-panel-slug": panelSlug ?? "",
    });
}

vi.mock("@/app/features/components/panel/panelKpi", () => ({
  PanelKpi: marker("panel-kpi"),
}));
vi.mock("@/app/features/components/panel/panelBlock", () => ({
  PanelBlock: marker("panel-block"),
}));
vi.mock("@/app/features/dashboard/ui/DashboardHeader", () => ({
  DashboardHeader: ({ documentId }: { documentId: string }) =>
    createElement("header", {
      "data-testid": "header",
      "data-project-id": documentId,
    }),
}));

import { DashboardContent } from "@/app/features/dashboard/ui/DashboardContent";
import { useSelectedPanel } from "@/app/features/dashboard/state/useSelectedPanel";
import { useSelectedProject } from "@/app/features/dashboard/state/useSelectedProject";
import { useDashboardWindow } from "@/app/features/dashboard/state/useDashboardWindow";
import { DEFAULT_WINDOW_PRESETS } from "@/app/features/dashboard/state/windowPresets";
import { renderWithQuery } from "../../../../helpers/renderHook";

const PANEL: DashboardPanel = {
  id: "panel-1",
  name: "production",
  slug: "production",
  icon: "activity",
  order: 1,
  isDevelopment: false,
  displayName: "Production",
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

describe("DashboardContent", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchProjectsClientMock.mockReset();
    fetchProjectConfigClientMock.mockReset();
    fetchProjectPanelsMock.mockReset();

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
    useDashboardWindow.setState({
      presets: [...DEFAULT_WINDOW_PRESETS],
      windowMinutes: 30,
    });
  });

  it("hydrates the window store from the server-resolved presets", () => {
    renderDashboard();

    expect(useDashboardWindow.getState().presets).toEqual([
      { minutes: 15, label: "15m" },
    ]);
    expect(useDashboardWindow.getState().windowMinutes).toBe(15);
  });

  it("re-applies the presets of the project it resolves", async () => {
    fetchProjectConfigClientMock.mockResolvedValue({
      documentId: "project-1",
      slug: "uxco",
      timeInterval: [{ duration: 6, interval: "hours" }],
    });

    renderDashboard();

    await waitFor(() =>
      expect(useDashboardWindow.getState().presets).toEqual([
        { minutes: 360, label: "6h" },
      ]),
    );
  });

  it("mounts both element lists on the resolved panel slug", async () => {
    renderDashboard();

    await waitFor(() =>
      expect(
        screen.getByTestId("panel-kpi").getAttribute("data-panel-slug"),
      ).toBe("production"),
    );
    expect(
      screen.getByTestId("panel-block").getAttribute("data-panel-slug"),
    ).toBe("production");
  });

  it("hands the header the project id, not the panel's", async () => {
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId("header").getAttribute("data-project-id")).toBe(
        "project-1",
      ),
    );
  });

  it("resolves a panel even with no header selector — the read-only kiosk path", async () => {
    // Interactivity is off by default, so DashboardHeader renders no selector.
    // Resolution has to come from useActivePanel or nothing would mount.
    renderDashboard();

    await waitFor(() =>
      expect(useSelectedPanel.getState().pannelId).toBe("panel-1"),
    );
    expect(useSelectedPanel.getState().panelSlug).toBe("production");
  });

  it("mounts the lists with no panel when the project declares none — an empty page, not an error", async () => {
    fetchProjectPanelsMock.mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => expect(fetchProjectPanelsMock).toHaveBeenCalled());
    expect(screen.getByTestId("panel-kpi").getAttribute("data-panel-slug")).toBe(
      "",
    );
    expect(screen.queryByText(/Erreur de chargement/)).toBeNull();
  });
});
