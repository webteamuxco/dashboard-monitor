import { describe, it, expect, vi, afterEach } from "vitest";
import { PanelRepository } from "@/lib/config/domain/repositories/PanelRepository";
import { StrapiClient } from "@/lib/config/domain/StrapiClient";

function buildRepository(): PanelRepository {
  return new PanelRepository(
    new StrapiClient({ baseUrl: "http://strapi.test", token: "strapi-token" }),
  );
}

function mockGraphQl(data: unknown) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ data }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastRequestBody(fetchMock: ReturnType<typeof mockGraphQl>) {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse(init.body as string) as {
    query: string;
    variables?: Record<string, unknown>;
  };
}

describe("PanelRepository.getProjectPanels", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("filters by project documentId, sorted by order", async () => {
    const fetchMock = mockGraphQl({
      dashboardPanels: [
        {
          documentId: "panel-1",
          name: "prod",
          slug: "prod",
          icon: "activity",
          order: 1,
          is_development: false,
        },
        {
          documentId: "panel-2",
          name: "staging",
          slug: "staging",
          icon: "bug",
          order: 2,
          is_development: false,
        },
      ],
    });

    const panels = await buildRepository().getProjectPanels("project-1", false);

    expect(lastRequestBody(fetchMock).query).toContain('sort: "order"');
    expect(panels?.map((panel) => panel.id)).toEqual(["panel-1", "panel-2"]);
  });

  it("excludes the development panels by default", async () => {
    const fetchMock = mockGraphQl({ dashboardPanels: [{ documentId: "panel-1" }] });

    await buildRepository().getProjectPanels("project-1", false);

    expect(lastRequestBody(fetchMock).variables).toEqual({
      panelProjectFilters: {
        project: { documentId: { eq: "project-1" } },
        is_development: { eq: false },
      },
    });
  });

  it("drops the is_development filter when dev panels are asked for", async () => {
    // No filter at all, not `eq: true` — the dev view shows both kinds.
    const fetchMock = mockGraphQl({ dashboardPanels: [{ documentId: "panel-1" }] });

    await buildRepository().getProjectPanels("project-1", true);

    expect(lastRequestBody(fetchMock).variables).toEqual({
      panelProjectFilters: {
        project: { documentId: { eq: "project-1" } },
      },
    });
  });

  it("selects every field the DTO reads", async () => {
    // The query ↔ DTO coupling is an unchecked cast: dropping a field from the
    // selection set silently makes its domain counterpart undefined.
    const fetchMock = mockGraphQl({ dashboardPanels: [{ documentId: "panel-1" }] });

    await buildRepository().getProjectPanels("project-1", false);

    const { query } = lastRequestBody(fetchMock);
    expect(query).toContain("is_development");
    expect(query).toContain("order");
  });

  it("returns null when the project has no panel", async () => {
    mockGraphQl({ dashboardPanels: [] });

    await expect(
      buildRepository().getProjectPanels("project-1", false),
    ).resolves.toBeNull();
  });

  it("carries no tool wiring — that belongs to the panel's elements", async () => {
    const fetchMock = mockGraphQl({ dashboardPanels: [{ documentId: "panel-1" }] });

    await buildRepository().getProjectPanels("project-1", false);

    const { query } = lastRequestBody(fetchMock);
    expect(query).not.toContain("tool_configuration");
    expect(query).not.toContain("mapped_tools");
  });
});
