import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchProjectsClient } from "@/app/features/config/data-access/fetchProjectsClient";
import { fetchProjectConfigClient } from "@/app/features/config/data-access/fetchProjectConfigClient";
import { fetchProjectPanels } from "@/app/features/config/data-access/fetchProjectPannels";
import {
  calledInit,
  calledUrl,
  mockError,
  mockOk,
  mockUnparseableError,
} from "../../../../helpers/fetchMock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchProjectsClient", () => {
  it("calls the catalog route without params", async () => {
    const fetchMock = mockOk([]);

    await fetchProjectsClient();

    expect(calledUrl(fetchMock)).toBe("/api/config/projects");
    expect(calledInit(fetchMock)).toMatchObject({ cache: "no-store" });
  });

  it("unwraps the catalog", async () => {
    mockOk([{ documentId: "project-1", title: "UXCO" }]);

    await expect(fetchProjectsClient()).resolves.toEqual([
      { documentId: "project-1", title: "UXCO" },
    ]);
  });

  it("throws the BFF error message on failure", async () => {
    mockError(502, "Strapi env vars missing: STRAPI_BASE_URL, STRAPI_TOKEN");

    await expect(fetchProjectsClient()).rejects.toThrow(
      "Strapi env vars missing: STRAPI_BASE_URL, STRAPI_TOKEN",
    );
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(503);

    await expect(fetchProjectsClient()).rejects.toThrow(
      "Request failed with status 503",
    );
  });
});

describe("fetchProjectConfigClient", () => {
  it("puts the project documentId in the path", async () => {
    const fetchMock = mockOk(null);

    await fetchProjectConfigClient("project-1");

    expect(calledUrl(fetchMock)).toBe("/api/config/projects/project-1");
  });

  it("passes a missing project through as null", async () => {
    mockOk(null);

    await expect(fetchProjectConfigClient("project-1")).resolves.toBeNull();
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(500);

    await expect(fetchProjectConfigClient("project-1")).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});

describe("fetchProjectPanels", () => {
  it("calls the project's panels route", async () => {
    const fetchMock = mockOk([]);

    await fetchProjectPanels("project-1");

    expect(calledUrl(fetchMock)).toBe("/api/config/projects/project-1/panels");
    expect(calledInit(fetchMock)).toMatchObject({ cache: "no-store" });
  });

  it("keeps the Strapi order — the first panel is the default one", async () => {
    mockOk([
      { id: "panel-1", slug: "prod", order: 1 },
      { id: "panel-2", slug: "staging", order: 2 },
    ]);

    const panels = await fetchProjectPanels("project-1");

    expect(panels.map((panel) => panel.slug)).toEqual(["prod", "staging"]);
  });

  it("throws the BFF error message on failure", async () => {
    mockError(502, "Strapi request failed: 401 Unauthorized");

    await expect(fetchProjectPanels("project-1")).rejects.toThrow(
      "Strapi request failed: 401 Unauthorized",
    );
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(500);

    await expect(fetchProjectPanels("project-1")).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});
