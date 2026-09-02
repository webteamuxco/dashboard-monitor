// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useSelectedProject } from "@/app/features/dashboard/state/useSelectedProject";
import { useSelectedPanel } from "@/app/features/dashboard/state/useSelectedPanel";

const PROJECT_KEY = "dashboard-selected-project";
const PANEL_KEY = "dashboard-selected-pannel";

describe("useSelectedProject", () => {
  beforeEach(() => {
    localStorage.clear();
    useSelectedProject.setState({ documentId: null });
  });

  it("starts empty so the server render and the first client render agree", () => {
    expect(useSelectedProject.getState().documentId).toBeNull();
  });

  it("stores the selected project", () => {
    useSelectedProject.getState().setDocumentId("project-2");

    expect(useSelectedProject.getState().documentId).toBe("project-2");
  });

  it("persists the selection under its localStorage key", () => {
    useSelectedProject.getState().setDocumentId("project-2");

    expect(localStorage.getItem(PROJECT_KEY)).toContain("project-2");
  });

  it("does not read localStorage until rehydrate is called (skipHydration)", () => {
    localStorage.setItem(
      PROJECT_KEY,
      JSON.stringify({ state: { documentId: "project-stored" }, version: 0 }),
    );

    expect(useSelectedProject.getState().documentId).toBeNull();
  });

  it("restores the persisted selection on rehydrate", async () => {
    localStorage.setItem(
      PROJECT_KEY,
      JSON.stringify({ state: { documentId: "project-stored" }, version: 0 }),
    );

    await useSelectedProject.persist.rehydrate();

    expect(useSelectedProject.getState().documentId).toBe("project-stored");
  });
});

describe("useSelectedPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    useSelectedPanel.setState({
      pannelId: "",
      panelSlug: null,
      panelIcon: "panels-right-bottom",
    });
  });

  it("starts from an empty selection", () => {
    const state = useSelectedPanel.getState();

    expect(state.pannelId).toBe("");
    expect(state.panelSlug).toBeNull();
  });

  it("stores id, slug and icon — all three describe the selection", () => {
    const { setPanelId, setPanelSlug, setPanelIcon } =
      useSelectedPanel.getState();

    setPanelId("panel-2");
    setPanelSlug("staging");
    setPanelIcon("bug");

    expect(useSelectedPanel.getState()).toMatchObject({
      pannelId: "panel-2",
      panelSlug: "staging",
      panelIcon: "bug",
    });
  });

  it("persists under the (misspelled) dashboard-selected-pannel key", () => {
    // The spelling is load-bearing: renaming it resets every kiosk.
    useSelectedPanel.getState().setPanelSlug("staging");

    expect(localStorage.getItem(PANEL_KEY)).toContain("staging");
  });

  it("does not read localStorage until rehydrate is called (skipHydration)", () => {
    localStorage.setItem(
      PANEL_KEY,
      JSON.stringify({
        state: { pannelId: "panel-9", panelSlug: "stored", panelIcon: "bug" },
        version: 0,
      }),
    );

    expect(useSelectedPanel.getState().panelSlug).toBeNull();
  });

  it("restores the persisted selection on rehydrate", async () => {
    localStorage.setItem(
      PANEL_KEY,
      JSON.stringify({
        state: { pannelId: "panel-9", panelSlug: "stored", panelIcon: "bug" },
        version: 0,
      }),
    );

    await useSelectedPanel.persist.rehydrate();

    expect(useSelectedPanel.getState()).toMatchObject({
      pannelId: "panel-9",
      panelSlug: "stored",
      panelIcon: "bug",
    });
  });
});
