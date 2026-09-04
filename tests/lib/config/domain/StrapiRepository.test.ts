import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrapiRepository } from "@/lib/config/domain/StrapiRepository";
import { StrapiClient } from "@/lib/config/domain/StrapiClient";

const BASE_URL = "http://strapi.test";
const TOKEN = "strapi-token";

function buildRepository(): StrapiRepository {
  return new StrapiRepository(
    new StrapiClient({ baseUrl: `${BASE_URL}/`, token: TOKEN }),
  );
}

interface StubResponse {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
}

// Typed parameters so `mock.calls[0]` keeps its [url, init] shape.
function mockGraphQl(data: unknown, override: StubResponse = {}) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ data }),
    ...override,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

type GraphQlFetchMock = ReturnType<typeof mockGraphQl>;

function lastRequestBody(fetchMock: GraphQlFetchMock) {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse(init.body as string) as {
    query: string;
    variables?: Record<string, unknown>;
  };
}

describe("StrapiRepository transport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to <baseUrl>/graphql with a Bearer token", async () => {
    const fetchMock = mockGraphQl({ projects: [] });

    await buildRepository().getProjects();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/graphql`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "content-type": "application/json",
      authorization: `Bearer ${TOKEN}`,
    });
  });

  it("names the endpoint in the error when the response is not ok", async () => {
    mockGraphQl(null, {
      ok: false,
      status: 405,
      statusText: "Method Not Allowed",
    });

    // A misconfigured STRAPI_BASE_URL is indistinguishable from a Strapi
    // failure unless the URL is in the message.
    await expect(buildRepository().getProjects()).rejects.toThrow(
      `Strapi request failed: 405 Method Not Allowed on ${BASE_URL}/graphql`,
    );
  });

  it("surfaces GraphQL errors, joined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          errors: [{ message: "Cannot query X" }, { message: "Forbidden" }],
        }),
      })),
    );

    await expect(buildRepository().getProjects()).rejects.toThrow(
      "Strapi GraphQL error: Cannot query X; Forbidden",
    );
  });

  it("throws when the payload carries no data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({}) })),
    );

    await expect(buildRepository().getProjects()).rejects.toThrow(
      "Strapi GraphQL response missing data",
    );
  });
});

describe("StrapiRepository queries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getProjects maps the catalog", async () => {
    mockGraphQl({
      projects: [
        {
          documentId: "project-1",
          title: "UXCO",
          slug: "uxco",
          publishedAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-02-01T00:00:00Z",
        },
      ],
    });

    const projects = await buildRepository().getProjects();

    expect(projects).toEqual([
      {
        documentId: "project-1",
        title: "UXCO",
        slug: "uxco",
        publishedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
      },
    ]);
  });

  it("getProjectById passes the project documentId and maps the project", async () => {
    const fetchMock = mockGraphQl({
      project: {
        documentId: "project-1",
        slug: "uxco",
        default_config: { DefaultRefreshIntervalMS: 20_000 },
        timeInterval: [{ duration: 12, interval: "hours" }],
      },
    });

    const project = await buildRepository().getProjectById("project-1");

    expect(lastRequestBody(fetchMock).variables).toEqual({
      documentId: "project-1",
    });
    expect(project).toMatchObject({
      documentId: "project-1",
      defaultConfig: { refreshIntervalMs: 20_000 },
      timeInterval: [{ duration: 12, interval: "hours" }],
    });
  });

  it("getProjectById returns null for an unknown project", async () => {
    mockGraphQl({ project: null });

    await expect(buildRepository().getProjectById("nope")).resolves.toBeNull();
  });

  it("getPanelById queries by panel documentId and maps the panel", async () => {
    const fetchMock = mockGraphQl({
      dashboardPanel: {
        documentId: "panel-1",
        name: "production",
        slug: "production",
        display_name: "Production",
        icon: "activity",
        order: 1,
        mapped_tools: [],
        tool_configuration: [],
      },
    });

    const panel = await buildRepository().getPanelById("panel-1");

    expect(lastRequestBody(fetchMock).variables).toEqual({
      documentId: "panel-1",
    });
    expect(panel).toMatchObject({ id: "panel-1", displayName: "Production" });
  });

  it("getPanelById returns null when the panel does not exist", async () => {
    mockGraphQl({ dashboardPanel: null });

    await expect(buildRepository().getPanelById("gone")).resolves.toBeNull();
  });

  it("getProjectPanels filters by project documentId, sorted by order", async () => {
    const fetchMock = mockGraphQl({
      dashboardPanels: [
        {
          documentId: "panel-1",
          name: "prod",
          slug: "prod",
          display_name: "Prod",
          icon: "activity",
          order: 1,
          is_development: false,
        },
        {
          documentId: "panel-2",
          name: "staging",
          slug: "staging",
          display_name: "Staging",
          icon: "bug",
          order: 2,
          is_development: false,
        },
      ],
    });

    const panels = await buildRepository().getProjectPanels("project-1", false);

    const body = lastRequestBody(fetchMock);
    expect(body.query).toContain('sort: "order"');
    expect(panels?.map((panel) => panel.id)).toEqual(["panel-1", "panel-2"]);
  });

  it("getProjectPanels excludes the development panels by default", async () => {
    const fetchMock = mockGraphQl({ dashboardPanels: [{ documentId: "panel-1" }] });

    await buildRepository().getProjectPanels("project-1", false);

    expect(lastRequestBody(fetchMock).variables).toEqual({
      panelProjectFilters: {
        project: { documentId: { eq: "project-1" } },
        is_development: { eq: false },
      },
    });
  });

  it("getProjectPanels drops the is_development filter when dev panels are asked for", async () => {
    // No filter at all, not `eq: true` — the dev view shows both kinds.
    const fetchMock = mockGraphQl({ dashboardPanels: [{ documentId: "panel-1" }] });

    await buildRepository().getProjectPanels("project-1", true);

    expect(lastRequestBody(fetchMock).variables).toEqual({
      panelProjectFilters: {
        project: { documentId: { eq: "project-1" } },
      },
    });
  });

  it("getProjectPanels selects is_development — the DTO reads it", async () => {
    // The query ↔ DTO coupling is an unchecked cast: dropping the field from
    // the selection set silently makes panel.isDevelopment undefined.
    const fetchMock = mockGraphQl({ dashboardPanels: [{ documentId: "panel-1" }] });

    await buildRepository().getProjectPanels("project-1", false);

    expect(lastRequestBody(fetchMock).query).toContain("is_development");
  });

  it("getProjectPanels returns null when the project has no panel", async () => {
    mockGraphQl({ dashboardPanels: [] });

    await expect(
      buildRepository().getProjectPanels("project-1", false),
    ).resolves.toBeNull();
  });

  it("getProjectStrategies filters by project documentId and panel slug", async () => {
    const fetchMock = mockGraphQl({
      strategies: [{ name: "error-monitor" }, { name: "log-monitor" }],
    });

    const strategies = await buildRepository().getProjectStrategies(
      "project-1",
      "production",
    );

    // The mapped tool is matched in the variables, never selected: the
    // selection set is just `name`, which is all StrategyDto declares.
    expect(lastRequestBody(fetchMock).query).not.toContain("mapped_tool {");
    expect(lastRequestBody(fetchMock).variables).toEqual({
      filters: {
        mapped_tool: {
          dashboard_panels: {
            slug: { eq: "production" },
            project: { documentId: { eq: "project-1" } },
          },
        },
      },
    });
    expect(strategies).toEqual([
      { name: "error-monitor" },
      { name: "log-monitor" },
    ]);
  });

  it("getProjectStrategies returns null when the panel maps nothing", async () => {
    mockGraphQl({ strategies: [] });

    await expect(
      buildRepository().getProjectStrategies("project-1", "empty"),
    ).resolves.toBeNull();
  });

  it("isPanelHasStrategy filters by panel documentId, strategy name and tool slug", async () => {
    const fetchMock = mockGraphQl({ strategies: [{ name: "error-monitor" }] });

    const supported = await buildRepository().isPanelHasStrategy(
      "panel-1",
      "error-monitor",
      "glitchtip",
    );

    expect(lastRequestBody(fetchMock).query).not.toContain("mapped_tool {");
    expect(lastRequestBody(fetchMock).variables).toEqual({
      strategyNameFilter: {
        name: { eq: "error-monitor" },
        mapped_tool: {
          dashboard_panels: { documentId: { eq: "panel-1" } },
          tool: { slug: { eq: "glitchtip" } },
        },
      },
      pagination: { limit: 1 },
    });
    expect(supported).toBe(true);
  });

  it("isPanelHasStrategy omits the tool filter when no slug is given", async () => {
    const fetchMock = mockGraphQl({ strategies: [] });

    const supported = await buildRepository().isPanelHasStrategy(
      "panel-1",
      "error-monitor",
    );

    const variables = lastRequestBody(fetchMock).variables as {
      strategyNameFilter: { mapped_tool: Record<string, unknown> };
    };
    expect(variables.strategyNameFilter.mapped_tool).not.toHaveProperty("tool");
    expect(supported).toBe(false);
  });
});

describe("StrapiClient", () => {
  it("strips the trailing slash so <baseUrl>/graphql never doubles it", () => {
    const client = new StrapiClient({
      baseUrl: "http://strapi.test/",
      token: "t",
    });

    expect(client.getBaseUrl()).toBe("http://strapi.test");
    expect(client.getToken()).toBe("t");
  });
});

describe("StrapiRepository ↔ query coupling", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("selects timeInterval on the project query", async () => {
    const fetchMock = mockGraphQl({ project: null });

    await buildRepository().getProjectById("project-1");

    // execute<T>() is an unchecked cast: a field dropped here becomes
    // `undefined` downstream with no error. This is the regression guard.
    const { query } = lastRequestBody(fetchMock);
    expect(query).toContain("timeInterval");
    expect(query).toContain("duration");
    expect(query).toContain("interval");
    expect(query).toContain("DefaultRefreshIntervalMS");
  });

  it("selects __typename on the panel's polymorphic tool configuration", async () => {
    const fetchMock = mockGraphQl({ dashboardPanel: null });

    await buildRepository().getPanelById("panel-1");

    // Without __typename the mapper's switch matches nothing and every tool
    // configuration maps to undefined.
    const { query } = lastRequestBody(fetchMock);
    expect(query).toContain("__typename");
    expect(query).toContain("ComponentConfigGlitchtipConfiguration");
    expect(query).toContain("ComponentConfigPosthogConfiguration");
    expect(query).toContain("display_name");
    expect(query).toContain("order");
  });
});
