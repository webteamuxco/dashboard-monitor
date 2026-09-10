import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrapiClientFactory } from "@/lib/config/domain/StrapiClientFactory";
import { StrapiClientStrategy } from "@/lib/config/domain/StrapiStrategy";
import { StrapiClient } from "@/lib/config/domain/StrapiClient";
import { ProjectRepository } from "@/lib/config/domain/repositories/ProjectRepository";
import { PanelRepository } from "@/lib/config/domain/repositories/PanelRepository";
import { DashboardKpiRepository } from "@/lib/config/domain/repositories/DashboardKpiRepository";
import { DashboardBlockRepository } from "@/lib/config/domain/repositories/DashboardBlockRepository";
import { glitchtipWiring } from "../../../helpers/toolWiring";

describe("StrapiClientFactory", () => {
  beforeEach(() => {
    delete process.env.STRAPI_BASE_URL;
    delete process.env.STRAPI_TOKEN;
  });

  it("builds a strategy from the environment", () => {
    process.env.STRAPI_BASE_URL = "http://strapi.test";
    process.env.STRAPI_TOKEN = "token";

    expect(new StrapiClientFactory().create()).toBeInstanceOf(
      StrapiClientStrategy,
    );
  });

  it("throws when the base URL is missing", () => {
    process.env.STRAPI_TOKEN = "token";

    expect(() => new StrapiClientFactory().create()).toThrow(
      /Strapi env vars missing/,
    );
  });

  it("throws when the token is missing", () => {
    process.env.STRAPI_BASE_URL = "http://strapi.test";

    expect(() => new StrapiClientFactory().create()).toThrow(
      /Strapi env vars missing/,
    );
  });

  it("names both variables in the message", () => {
    expect(() => new StrapiClientFactory().create()).toThrow(
      /STRAPI_BASE_URL, STRAPI_TOKEN/,
    );
  });
});

describe("StrapiClientStrategy", () => {
  const client = new StrapiClient({
    baseUrl: "http://strapi.test",
    token: "token",
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds one repository per content type on its client", () => {
    const strategy = new StrapiClientStrategy(client);

    expect(strategy.projectRepository).toBeInstanceOf(ProjectRepository);
    expect(strategy.panelRepository).toBeInstanceOf(PanelRepository);
    expect(strategy.dashboardKpiRepository).toBeInstanceOf(DashboardKpiRepository);
    expect(strategy.dashboardBlockRepository).toBeInstanceOf(DashboardBlockRepository);
  });

  it("delegates getProjects", async () => {
    const spy = vi
      .spyOn(ProjectRepository.prototype, "getProjects")
      .mockResolvedValue([]);

    await expect(new StrapiClientStrategy(client).getProjects()).resolves.toEqual(
      [],
    );
    expect(spy).toHaveBeenCalledWith();
  });

  it("delegates getProjectById with the project documentId", async () => {
    const spy = vi
      .spyOn(ProjectRepository.prototype, "getProjectById")
      .mockResolvedValue(null);

    await new StrapiClientStrategy(client).getProjectById("project-1");

    expect(spy).toHaveBeenCalledWith("project-1");
  });

  it("delegates getProjectPanels with the project documentId and the dev-panel flag", async () => {
    const spy = vi
      .spyOn(PanelRepository.prototype, "getProjectPanels")
      .mockResolvedValue(null);

    await new StrapiClientStrategy(client).getProjectPanels("project-1", false);
    await new StrapiClientStrategy(client).getProjectPanels("project-2", true);

    expect(spy).toHaveBeenNthCalledWith(1, "project-1", false);
    expect(spy).toHaveBeenNthCalledWith(2, "project-2", true);
  });

  it("delegates getKpiWiring with the KPI documentId", async () => {
    const spy = vi
      .spyOn(DashboardKpiRepository.prototype, "getKpiWiring")
      .mockResolvedValue(glitchtipWiring());

    await new StrapiClientStrategy(client).getKpiWiring("kpi-1");

    expect(spy).toHaveBeenCalledWith("kpi-1");
  });

  it("delegates getBlockWiring with the block documentId", async () => {
    const spy = vi
      .spyOn(DashboardBlockRepository.prototype, "getBlockWiring")
      .mockResolvedValue(glitchtipWiring());

    await new StrapiClientStrategy(client).getBlockWiring("block-1");

    expect(spy).toHaveBeenCalledWith("block-1");
  });
});
