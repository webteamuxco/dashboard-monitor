import { describe, it, expect } from "vitest";
import {
  mapDashboardPanel,
  mapProject,
  mapProjectStrategy,
  mapProjectSummary,
} from "@/lib/config/domain/mappers/projectMapper";
import type {
  DashboardPanelDto,
  ProjectDto,
  ProjectSummaryDto,
} from "@/lib/config/domain/dto/StrapiProject";

function buildPanelDto(overrides: Partial<DashboardPanelDto> = {}): DashboardPanelDto {
  return {
    documentId: "panel-1",
    name: "production",
    slug: "production",
    display_name: "Production",
    icon: "panels-right-bottom",
    order: 1,
    mapped_tools: [
      {
        documentId: "mt-1",
        name: "GlitchTip",
        strategies: [{ name: "error-monitor" }, { name: "log-monitor" }],
      },
    ],
    tool_configuration: [
      {
        __typename: "ComponentConfigGlitchtipConfiguration",
        id: "cfg-1",
        url: "https://glitchtip.example",
        projectId: "42",
        organization: "uxco-group",
        tool: { slug: "glitchtip" },
      },
    ],
    ...overrides,
  };
}

describe("mapDashboardPanel", () => {
  it("renames every Strapi field to the domain shape", () => {
    const panel = mapDashboardPanel(buildPanelDto());

    expect(panel).toMatchObject({
      id: "panel-1",
      name: "production",
      slug: "production",
      displayName: "Production",
      icon: "panels-right-bottom",
      order: 1,
    });
  });

  it("maps the mapped tools with their strategy names", () => {
    const panel = mapDashboardPanel(buildPanelDto());

    expect(panel.mappedTools).toEqual([
      {
        documentId: "mt-1",
        name: "GlitchTip",
        strategies: [{ name: "error-monitor" }, { name: "log-monitor" }],
      },
    ]);
  });

  it("maps a GlitchTip configuration, taking the tool slug", () => {
    const panel = mapDashboardPanel(buildPanelDto());

    expect(panel.toolConfigurations).toEqual([
      {
        kind: "glitchtip",
        id: "cfg-1",
        url: "https://glitchtip.example",
        projectId: "42",
        organization: "uxco-group",
        toolSlug: "glitchtip",
      },
    ]);
  });

  it("falls back to an empty tool slug when the relation is null", () => {
    const panel = mapDashboardPanel(
      buildPanelDto({
        tool_configuration: [
          {
            __typename: "ComponentConfigGlitchtipConfiguration",
            id: "cfg-1",
            url: "https://glitchtip.example",
            projectId: "42",
            organization: "uxco-group",
            tool: null,
          },
        ],
      }),
    );

    expect(panel.toolConfigurations?.[0]).toMatchObject({ toolSlug: "" });
  });

  it("maps a PostHog configuration without organization", () => {
    const panel = mapDashboardPanel(
      buildPanelDto({
        tool_configuration: [
          {
            __typename: "ComponentConfigPosthogConfiguration",
            id: "cfg-2",
            url: "https://eu.posthog.com",
            projectId: "9001",
          },
        ],
      }),
    );

    expect(panel.toolConfigurations).toEqual([
      {
        kind: "posthog",
        id: "cfg-2",
        url: "https://eu.posthog.com",
        projectId: "9001",
      },
    ]);
  });

  it("leaves the optional relations undefined when Strapi omits them", () => {
    const panel = mapDashboardPanel(
      buildPanelDto({ mapped_tools: undefined, tool_configuration: undefined }),
    );

    expect(panel.mappedTools).toBeUndefined();
    expect(panel.toolConfigurations).toBeUndefined();
  });
});

describe("mapProject", () => {
  function buildProjectDto(overrides: Partial<ProjectDto> = {}): ProjectDto {
    return {
      documentId: "project-1",
      slug: "uxco",
      default_config: { DefaultRefreshIntervalMS: 15_000 },
      timeInterval: [
        { duration: 30, interval: "minutes" },
        { duration: 6, interval: "hours" },
      ],
      ...overrides,
    };
  }

  it("maps identity, refresh cadence and window presets", () => {
    const project = mapProject(buildProjectDto());

    expect(project).toEqual({
      documentId: "project-1",
      slug: "uxco",
      defaultConfig: { refreshIntervalMs: 15_000 },
      timeInterval: [
        { duration: 30, interval: "minutes" },
        { duration: 6, interval: "hours" },
      ],
    });
  });

  it("carries timeInterval through — the field the window presets depend on", () => {
    const project = mapProject(buildProjectDto());

    // Regression guard: dropping `timeInterval` from the GraphQL selection set
    // silently fed the window store its env defaults instead of Strapi's.
    expect(project.timeInterval).toHaveLength(2);
  });

  it("leaves defaultConfig undefined when Strapi has none", () => {
    const project = mapProject(buildProjectDto({ default_config: null }));

    expect(project.defaultConfig).toBeUndefined();
  });

  it("does not expose panels — they have their own queries", () => {
    const project = mapProject(buildProjectDto());

    expect(project).not.toHaveProperty("dashboardPanels");
  });
});

describe("mapProjectSummary", () => {
  it("maps a catalog entry", () => {
    const dto: ProjectSummaryDto = {
      documentId: "project-1",
      title: "UXCO",
      slug: "uxco",
      publishedAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
    };

    expect(mapProjectSummary(dto)).toEqual(dto);
  });
});

describe("mapProjectStrategy", () => {
  it("maps the strategy name", () => {
    // The name is the whole payload: the mapped tool is matched in the query's
    // `variables`, so it never needs to be selected.
    expect(mapProjectStrategy({ name: "tracker-monitor" })).toEqual({
      name: "tracker-monitor",
    });
  });

  it.each(["error-monitor", "log-monitor", "tracker-monitor"] as const)(
    "maps %s",
    (name) => {
      expect(mapProjectStrategy({ name })).toEqual({ name });
    },
  );
});
