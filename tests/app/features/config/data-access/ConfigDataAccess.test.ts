import { describe, it, expect, vi, beforeEach } from "vitest";

const getProjectsMock = vi.fn();
const getProjectByIdMock = vi.fn();
const getProjectStrategiesMock = vi.fn();
const getProjectPanelsMock = vi.fn();

vi.mock("@/lib/config/domain/StrapiClientFactory", () => ({
  StrapiClientFactory: class {
    create() {
      return {
        getProjects: getProjectsMock,
        getProjectById: getProjectByIdMock,
        getProjectStrategies: getProjectStrategiesMock,
        getProjectPanels: getProjectPanelsMock,
      };
    }
  },
}));

import { ConfigDataAccess } from "@/app/features/config/data-access/ConfigDataAccess";

// The module-level fetchers are wrapped in React cache(). It only dedupes
// inside a React request context, so nothing is shared between cases here —
// distinct project ids per case simply keep the assertions readable.
describe("ConfigDataAccess", () => {
  beforeEach(() => {
    getProjectsMock.mockReset();
    getProjectByIdMock.mockReset();
    getProjectStrategiesMock.mockReset();
    getProjectPanelsMock.mockReset();
  });

  it("getProjectsList returns the Strapi catalog", async () => {
    getProjectsMock.mockResolvedValue([{ documentId: "project-1" }]);

    await expect(new ConfigDataAccess().getProjectsList()).resolves.toEqual([
      { documentId: "project-1" },
    ]);
  });

  it("getProjectConfig forwards the project documentId", async () => {
    getProjectByIdMock.mockResolvedValue({ documentId: "cfg-project-1" });

    const project = await new ConfigDataAccess().getProjectConfig(
      "cfg-project-1",
    );

    expect(getProjectByIdMock).toHaveBeenCalledWith("cfg-project-1");
    expect(project).toEqual({ documentId: "cfg-project-1" });
  });

  it("getProjectConfig passes a missing project through as null", async () => {
    getProjectByIdMock.mockResolvedValue(null);

    await expect(
      new ConfigDataAccess().getProjectConfig("cfg-project-missing"),
    ).resolves.toBeNull();
  });

  it("getProjectPanels forwards the project documentId and the dev-panel flag", async () => {
    getProjectPanelsMock.mockResolvedValue([{ id: "panel-1" }]);

    const panels = await new ConfigDataAccess().getProjectPanels(
      "panels-project-1",
      false,
    );

    expect(getProjectPanelsMock).toHaveBeenCalledWith("panels-project-1", false);
    expect(panels).toEqual([{ id: "panel-1" }]);
  });

  it("getProjectPanels forwards the dev-panel flag when it is on", async () => {
    getProjectPanelsMock.mockResolvedValue([{ id: "panel-dev" }]);

    await new ConfigDataAccess().getProjectPanels("panels-project-dev", true);

    expect(getProjectPanelsMock).toHaveBeenCalledWith("panels-project-dev", true);
  });

  it("getProjectPanels passes an empty project through as null", async () => {
    getProjectPanelsMock.mockResolvedValue(null);

    await expect(
      new ConfigDataAccess().getProjectPanels("panels-project-empty", false),
    ).resolves.toBeNull();
  });

  it("keeps the two dev-panel flags apart — cache() is keyed on both arguments", async () => {
    getProjectPanelsMock.mockImplementation(
      async (_projectId: string, showDevelopmentPanel: boolean) =>
        showDevelopmentPanel
          ? [{ id: "panel-prod" }, { id: "panel-dev" }]
          : [{ id: "panel-prod" }],
    );
    const dataAccess = new ConfigDataAccess();

    const withoutDev = await dataAccess.getProjectPanels("panels-project-c", false);
    const withDev = await dataAccess.getProjectPanels("panels-project-c", true);

    expect(withoutDev).toEqual([{ id: "panel-prod" }]);
    expect(withDev).toEqual([{ id: "panel-prod" }, { id: "panel-dev" }]);
  });

  it("getProjectStrategies forwards the project id and the panel slug", async () => {
    getProjectStrategiesMock.mockResolvedValue([{ name: "error-monitor" }]);

    const strategies = await new ConfigDataAccess().getProjectStrategies(
      "strat-project-1",
      "production",
    );

    expect(getProjectStrategiesMock).toHaveBeenCalledWith(
      "strat-project-1",
      "production",
    );
    expect(strategies).toEqual([{ name: "error-monitor" }]);
  });

  it("getProjectStrategies tolerates a null panel slug", async () => {
    getProjectStrategiesMock.mockResolvedValue(null);

    await expect(
      new ConfigDataAccess().getProjectStrategies("strat-project-2", null),
    ).resolves.toBeNull();
    expect(getProjectStrategiesMock).toHaveBeenCalledWith(
      "strat-project-2",
      null,
    );
  });

  it("keeps two projects apart — the cache() wrapper is keyed on its arguments", async () => {
    getProjectByIdMock.mockImplementation(async (documentId: string) => ({
      documentId,
    }));
    const dataAccess = new ConfigDataAccess();

    const first = await dataAccess.getProjectConfig("cfg-project-a");
    const second = await dataAccess.getProjectConfig("cfg-project-b");

    expect(first).toEqual({ documentId: "cfg-project-a" });
    expect(second).toEqual({ documentId: "cfg-project-b" });
    expect(getProjectByIdMock).toHaveBeenNthCalledWith(1, "cfg-project-a");
    expect(getProjectByIdMock).toHaveBeenNthCalledWith(2, "cfg-project-b");
  });

  it("exports a singleton the routes and page.tsx share", async () => {
    const { configDataAccess } = await import(
      "@/app/features/config/data-access/ConfigDataAccess"
    );

    expect(configDataAccess).toBeInstanceOf(ConfigDataAccess);
  });
});
