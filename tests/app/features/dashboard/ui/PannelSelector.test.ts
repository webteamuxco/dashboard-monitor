// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { DashboardPanel } from "@/lib/config/domain/DashboardPanels";

const { fetchProjectPanelsMock } = vi.hoisted(() => ({
  fetchProjectPanelsMock: vi.fn(),
}));

vi.mock("@/app/features/config/data-access/fetchProjectPannels", () => ({
  fetchProjectPanels: fetchProjectPanelsMock,
}));

import { PannelSelector } from "@/app/features/dashboard/ui/PannelSelector";
import { useSelectedPanel } from "@/app/features/dashboard/state/useSelectedPanel";
import { useSelectedProject } from "@/app/features/dashboard/state/useSelectedProject";
import { renderWithQuery } from "../../../../helpers/renderHook";

function buildPanel(overrides: Partial<DashboardPanel> = {}): DashboardPanel {
  return {
    id: "panel-1",
    name: "production",
    slug: "production",
    displayName: "Production",
    icon: "activity",
    order: 1,
    ...overrides,
  };
}

const PROD = buildPanel();
const STAGING = buildPanel({
  id: "panel-2",
  name: "staging",
  slug: "staging",
  displayName: "Staging",
  icon: "bug",
  order: 2,
});

function renderSelector(fallbackDocumentId = "project-1") {
  return renderWithQuery(createElement(PannelSelector, { fallbackDocumentId }));
}

describe("PannelSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchProjectPanelsMock.mockReset();
    useSelectedProject.setState({ documentId: null });
    useSelectedPanel.setState({
      pannelId: "",
      panelSlug: null,
      panelIcon: "panels-right-bottom",
    });
  });

  it("renders one option per panel, labelled with its display name", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    renderSelector();

    await waitFor(() => expect(screen.getByRole("combobox")).toBeDefined());
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Production", "Staging"]);
  });

  it("renders nothing below two panels — a single-panel project needs no control", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD]);

    const { container } = renderSelector();

    await waitFor(() => expect(fetchProjectPanelsMock).toHaveBeenCalled());
    expect(container.querySelector("select")).toBeNull();
  });

  it("renders nothing while the panel list is loading", () => {
    fetchProjectPanelsMock.mockImplementation(() => new Promise(() => {}));

    const { container } = renderSelector();

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the project has no panel", async () => {
    fetchProjectPanelsMock.mockResolvedValue([]);

    const { container } = renderSelector();

    await waitFor(() => expect(fetchProjectPanelsMock).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("writes id, slug and icon when the user picks another panel", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);
    useSelectedPanel.setState({
      pannelId: "panel-1",
      panelSlug: "production",
      panelIcon: "activity",
    });

    renderSelector();

    const select = await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(select, { target: { value: "staging" } });

    expect(useSelectedPanel.getState()).toMatchObject({
      pannelId: "panel-2",
      panelSlug: "staging",
      panelIcon: "bug",
    });
  });

  it("ignores a change to a slug that is not in the list", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);
    useSelectedPanel.setState({
      pannelId: "panel-1",
      panelSlug: "production",
      panelIcon: "activity",
    });

    renderSelector();

    const select = await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(select, { target: { value: "ghost" } });

    expect(useSelectedPanel.getState().pannelId).toBe("panel-1");
  });

  it("shows the stored panel as the current value", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);
    useSelectedPanel.setState({
      pannelId: "panel-2",
      panelSlug: "staging",
      panelIcon: "bug",
    });

    renderSelector();

    const select = (await waitFor(() =>
      screen.getByRole("combobox"),
    )) as HTMLSelectElement;
    expect(select.value).toBe("staging");
  });

  it("falls back to the first panel's slug when nothing is selected yet", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    renderSelector();

    const select = (await waitFor(() =>
      screen.getByRole("combobox"),
    )) as HTMLSelectElement;
    expect(select.value).toBe("production");
  });

  it("lists the selected project's panels, not the fallback's", async () => {
    useSelectedProject.setState({ documentId: "project-2" });
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    renderSelector("project-1");

    await waitFor(() =>
      expect(fetchProjectPanelsMock).toHaveBeenCalledWith("project-2"),
    );
  });

  it("uses the fallback project until one is selected", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    renderSelector("project-1");

    await waitFor(() =>
      expect(fetchProjectPanelsMock).toHaveBeenCalledWith("project-1"),
    );
  });

  it("renders a lucide icon resolved from the kebab-case Strapi name", async () => {
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);
    useSelectedPanel.setState({
      pannelId: "panel-1",
      panelSlug: "production",
      panelIcon: "activity",
    });

    const { container } = renderSelector();

    await waitFor(() => expect(screen.getByRole("combobox")).toBeDefined());
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("falls back to a circle when the icon name matches nothing", async () => {
    // The fallback is deliberate and silent: a typo in Strapi must not blank
    // out the selector.
    fetchProjectPanelsMock.mockResolvedValue([
      buildPanel({ icon: "not-a-lucide-icon" }),
      STAGING,
    ]);

    const { container } = renderSelector();

    await waitFor(() => expect(screen.getByRole("combobox")).toBeDefined());
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("falls back to a circle when the panel carries no icon at all", async () => {
    fetchProjectPanelsMock.mockResolvedValue([
      buildPanel({ icon: "" }),
      STAGING,
    ]);

    const { container } = renderSelector();

    await waitFor(() => expect(screen.getByRole("combobox")).toBeDefined());
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("does not resolve the selection itself — that is useActivePanel's job", async () => {
    // It is only mounted in interactive mode, so auto-selecting here would
    // leave a read-only kiosk with no panel and no widget.
    fetchProjectPanelsMock.mockResolvedValue([PROD, STAGING]);

    renderSelector();

    await waitFor(() => expect(screen.getByRole("combobox")).toBeDefined());
    expect(useSelectedPanel.getState().pannelId).toBe("");
    expect(useSelectedPanel.getState().panelSlug).toBeNull();
  });
});
