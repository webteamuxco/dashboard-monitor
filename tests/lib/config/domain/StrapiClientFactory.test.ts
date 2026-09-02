import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrapiClientFactory } from "@/lib/config/domain/StrapiClientFactory";
import { StrapiClientStrategy } from "@/lib/config/domain/StrapiStrategy";
import { StrapiClient } from "@/lib/config/domain/StrapiClient";
import { StrapiRepository } from "@/lib/config/domain/StrapiRepository";

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

  it("exposes a repository built on its client", () => {
    expect(new StrapiClientStrategy(client).getRepository()).toBeInstanceOf(
      StrapiRepository,
    );
  });

  it("delegates getProjects", async () => {
    const spy = vi
      .spyOn(StrapiRepository.prototype, "getProjects")
      .mockResolvedValue([]);

    await expect(new StrapiClientStrategy(client).getProjects()).resolves.toEqual(
      [],
    );
    expect(spy).toHaveBeenCalledWith();
  });

  it("delegates getProjectById with the project documentId", async () => {
    const spy = vi
      .spyOn(StrapiRepository.prototype, "getProjectById")
      .mockResolvedValue(null);

    await new StrapiClientStrategy(client).getProjectById("project-1");

    expect(spy).toHaveBeenCalledWith("project-1");
  });

  it("delegates getPanelById with the panel documentId", async () => {
    const spy = vi
      .spyOn(StrapiRepository.prototype, "getPanelById")
      .mockResolvedValue(null);

    await new StrapiClientStrategy(client).getPanelById("panel-1");

    expect(spy).toHaveBeenCalledWith("panel-1");
  });

  it("delegates isPanelHasStrategy with all three arguments", async () => {
    const spy = vi
      .spyOn(StrapiRepository.prototype, "isPanelHasStrategy")
      .mockResolvedValue(true);

    await expect(
      new StrapiClientStrategy(client).isPanelHasStrategy(
        "panel-1",
        "error-monitor",
        "glitchtip",
      ),
    ).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith("panel-1", "error-monitor", "glitchtip");
  });

  it("delegates getProjectStrategies with the project id and the panel slug", async () => {
    const spy = vi
      .spyOn(StrapiRepository.prototype, "getProjectStrategies")
      .mockResolvedValue(null);

    await new StrapiClientStrategy(client).getProjectStrategies(
      "project-1",
      "production",
    );

    expect(spy).toHaveBeenCalledWith("project-1", "production");
  });

  it("delegates getProjectPanels with the project documentId", async () => {
    const spy = vi
      .spyOn(StrapiRepository.prototype, "getProjectPanels")
      .mockResolvedValue(null);

    await new StrapiClientStrategy(client).getProjectPanels("project-1");

    expect(spy).toHaveBeenCalledWith("project-1");
  });
});
