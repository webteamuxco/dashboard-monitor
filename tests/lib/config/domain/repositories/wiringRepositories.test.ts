import { describe, it, expect, vi, afterEach } from "vitest";
import { StrapiClient } from "@/lib/config/domain/StrapiClient";
import { DashboardKpiRepository } from "@/lib/config/domain/repositories/DashboardKpiRepository";
import { DashboardBlockRepository } from "@/lib/config/domain/repositories/DashboardBlockRepository";
import type { ToolWiringDto } from "@/lib/config/domain/dto/StrapiTool";

const BASE_URL = "http://strapi.test";
const TOKEN = "strapi-token";

function client(): StrapiClient {
  return new StrapiClient({ baseUrl: BASE_URL, token: TOKEN });
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

const WIRING_DTO: ToolWiringDto = {
  documentId: "kpi-1",
  strategy: [
    { __typename: "ComponentStrategyErrorMonitor", id: "s1" },
  ],
  tool: {
    documentId: "tool-1",
    name: "GlitchTip",
    slug: "glitchtip",
    configuration: [
      {
        __typename: "ComponentConfigGlitchtipConfiguration",
        id: "cfg-1",
        url: "https://glitchtip.example",
        projectId: "42",
        organization: "uxco-group",
      },
    ],
  },
};

describe("DashboardKpiRepository.getKpiWiring", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the KPI documentId as the query variable", async () => {
    const fetchMock = mockGraphQl({ dashboardKpi: WIRING_DTO });

    await new DashboardKpiRepository(client()).getKpiWiring("kpi-1");

    expect(lastRequestBody(fetchMock).variables).toEqual({ documentId: "kpi-1" });
  });

  it("selects __typename on both dynamic zones — the mappers switch on it", async () => {
    const fetchMock = mockGraphQl({ dashboardKpi: WIRING_DTO });

    await new DashboardKpiRepository(client()).getKpiWiring("kpi-1");

    const { query } = lastRequestBody(fetchMock);
    expect(query).toMatch(/strategy\s*\{\s*__typename/);
    expect(query).toMatch(/configuration\s*\{\s*__typename/);
  });

  it("returns the mapped wiring", async () => {
    mockGraphQl({ dashboardKpi: WIRING_DTO });

    await expect(
      new DashboardKpiRepository(client()).getKpiWiring("kpi-1"),
    ).resolves.toEqual({
      id: "kpi-1",
      strategy: { kind: "error-monitor", id: "s1" },
      configuration: {
        kind: "glitchtip",
        id: "cfg-1",
        url: "https://glitchtip.example",
        projectId: "42",
        organization: "uxco-group",
      },
    });
  });

  it("returns null when Strapi knows no such KPI", async () => {
    mockGraphQl({ dashboardKpi: null });

    await expect(
      new DashboardKpiRepository(client()).getKpiWiring("nope"),
    ).resolves.toBeNull();
  });
});

describe("DashboardBlockRepository.getBlockWiring", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the dashboardBlock envelope, not the KPI one", async () => {
    const fetchMock = mockGraphQl({
      dashboardBlock: { ...WIRING_DTO, documentId: "block-1" },
    });

    const wiring = await new DashboardBlockRepository(client()).getBlockWiring(
      "block-1",
    );

    expect(lastRequestBody(fetchMock).query).toMatch(/dashboardBlock\(documentId:/);
    expect(wiring?.id).toBe("block-1");
  });

  it("maps a block onto the very same wiring shape as a KPI", async () => {
    mockGraphQl({ dashboardBlock: { ...WIRING_DTO, documentId: "block-1" } });

    const wiring = await new DashboardBlockRepository(client()).getBlockWiring(
      "block-1",
    );

    expect(wiring?.strategy).toEqual({ kind: "error-monitor", id: "s1" });
    expect(wiring?.configuration?.kind).toBe("glitchtip");
  });

  it("returns null when Strapi knows no such block", async () => {
    mockGraphQl({ dashboardBlock: null });

    await expect(
      new DashboardBlockRepository(client()).getBlockWiring("nope"),
    ).resolves.toBeNull();
  });
});
