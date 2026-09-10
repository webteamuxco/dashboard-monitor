import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProjectRepository } from "@/lib/config/domain/repositories/ProjectRepository";
import { StrapiClient } from "@/lib/config/domain/StrapiClient";

const BASE_URL = "http://strapi.test";
const TOKEN = "strapi-token";

function buildRepository(): ProjectRepository {
  return new ProjectRepository(
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

// The transport lives in AbstractStrapiRepository, shared by every repository:
// exercising it through one concrete subclass covers all of them.
describe("Strapi repository transport", () => {
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

describe("ProjectRepository", () => {
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

describe("ProjectRepository ↔ query coupling", () => {
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
});
