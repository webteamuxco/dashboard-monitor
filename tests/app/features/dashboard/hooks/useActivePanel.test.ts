// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import type { DashboardPanel } from "@/lib/config/domain/DashboardPanels";

// vi.hoisted: vi.mock is lifted above every const, so a factory that reads a
// plain top-level variable hits its temporal dead zone.
const { fetchProjectPanelsMock } = vi.hoisted(() => ({
  fetchProjectPanelsMock: vi.fn(),
}));

vi.mock("@/app/features/config/data-access/fetchProjectPannels", () => ({
  fetchProjectPanels: fetchProjectPanelsMock,
}));

import { useActivePanel } from "@/app/features/dashboard/hooks/useActivePanel";
import { useSelectedPanel } from "@/app/features/dashboard/state/useSelectedPanel";
import { renderQueryHook } from "../../../../helpers/renderHook";

const PANEL_KEY = "dashboard-selected-pannel";

function buildPanel(overrides: Partial<DashboardPanel> = {}): DashboardPanel {
  return {
    id: "panel-1",
    name: "production",
    slug: "production",
    icon: "activity",
    order: 1,
    isDevelopment: false,
    displayName: "Production",
    ...overrides,
  };
}

const PROD = buildPanel();
const STAGING = buildPanel({
  id: "panel-2",
  name: "staging",
  slug: "staging",
  icon: "bug",
  order: 2,
});

function persist(state: Record<string, unknown>) {
  localStorage.setItem(PANEL_KEY, JSON.stringify({ state, version: 0 }));
}

describe("useActivePanel", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchProjectPanelsMock.mockReset();
    useSelectedPanel.setState({
      pannelId: "",
      panelSlug: null,
      panelIcon: "panels-right-bottom",
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("selects the first panel by order when nothing is persisted", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    const { result } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(result.current.panelId).toBe("panel-1"));
    expect(result.current.panelSlug).toBe("production");
    // The server prefetch keyed its widget queries on this very panel.
    expect(useSelectedPanel.getState().panelIcon).toBe("activity");
  });

  it("restores the persisted panel", async () => {
    persist({ pannelId: "panel-2", panelSlug: "staging", panelIcon: "bug" });
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    const { result } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(result.current.panelSlug).toBe("staging"));
    expect(result.current.panelId).toBe("panel-2");
  });

  it("falls back to the first panel when the persisted slug no longer exists", async () => {
    persist({ pannelId: "panel-9", panelSlug: "deleted", panelIcon: "bug" });
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    const { result } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(result.current.panelId).toBe("panel-1"));
    expect(result.current.panelSlug).toBe("production");
  });

  it("re-resolves the id when the persisted slug belongs to another project", async () => {
    // Two projects can both have a "production" panel; keeping the stored id
    // would point every widget at the wrong provider project.
    persist({
      pannelId: "other-project-panel",
      panelSlug: "production",
      panelIcon: "activity",
    });
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    const { result } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(result.current.panelId).toBe("panel-1"));
    expect(result.current.panelSlug).toBe("production");
  });

  it("re-selects when the project changes", async () => {
    fetchProjectPanelsMock.mockImplementation(async (documentId: string) =>
      documentId === "project-1"
        ? [PROD, STAGING]
        : [buildPanel({ id: "panel-3", slug: "audience", icon: "users" })],
    );

    const { result, rerender } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(result.current.panelId).toBe("panel-1"));

    rerender("project-2");

    await waitFor(() => expect(result.current.panelId).toBe("panel-3"));
    expect(result.current.panelSlug).toBe("audience");
  });

  it("drops the selection when the project it switches to has no panel", async () => {
    // Holding the previous project's panel would keep its KPIs and blocks on
    // screen — the widgets are keyed on the panel slug, not on the project.
    fetchProjectPanelsMock.mockImplementation(async (documentId: string) =>
      documentId === "project-1" ? [PROD, STAGING] : [],
    );

    const { result, rerender } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(result.current.panelSlug).toBe("production"));

    rerender("project-2");

    await waitFor(() => expect(result.current.panelSlug).toBeNull());
    expect(result.current.panelId).toBe("");
  });

  it("keeps the current panel while the next project's list is loading", async () => {
    let resolveSecond: ((panels: DashboardPanel[]) => void) | undefined;
    fetchProjectPanelsMock.mockImplementation(async (documentId: string) =>
      documentId === "project-1"
        ? [PROD, STAGING]
        : new Promise<DashboardPanel[]>((resolve) => {
            resolveSecond = resolve;
          }),
    );

    const { result, rerender } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(result.current.panelSlug).toBe("production"));

    rerender("project-2");

    expect(result.current.panelSlug).toBe("production");

    resolveSecond?.([buildPanel({ id: "panel-3", slug: "audience" })]);
    await waitFor(() => expect(result.current.panelSlug).toBe("audience"));
  });

  it("fetches the panel list per project", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD]);

    renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() =>
      expect(fetchProjectPanelsMock).toHaveBeenCalledWith("project-1", false),
    );
  });

  it("selects nothing while the panel list is empty", async () => {
    fetchProjectPanelsMock.mockResolvedValue([]);

    const { result } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(result.current.panels).toEqual([]));
    expect(result.current.panelId).toBe("");
    expect(result.current.panelSlug).toBeNull();
  });

  it("selects nothing when the panel list fails to load", async () => {
    fetchProjectPanelsMock.mockRejectedValue(new Error("502"));

    const { result } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(fetchProjectPanelsMock).toHaveBeenCalled());
    expect(result.current.panelId).toBe("");
  });

  it("exposes the panel list so the selector renders from the same data", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    const { result } = renderQueryHook(
      (documentId: string) => useActivePanel(documentId),
      "project-1",
    );

    await waitFor(() => expect(result.current.panels).toHaveLength(2));
  });
});
