import { describe, it, expect } from "vitest";
import { mapToolWiring } from "@/lib/config/domain/mappers/toolWiringMapper";
import type { ToolWiringDto } from "@/lib/config/domain/dto/StrapiTool";

// `dashboardKpi` and `dashboardBlock` project onto this same DTO, so what is
// asserted here holds for both content types.
function buildWiringDto(overrides: Partial<ToolWiringDto> = {}): ToolWiringDto {
  return {
    documentId: "kpi-1",
    strategy: [
      {
        __typename: "ComponentStrategyErrorMonitor",
        id: "s1",
      },
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
    ...overrides,
  };
}

describe("mapToolWiring", () => {
  it("renames documentId and pairs the strategy with the tool configuration", () => {
    expect(mapToolWiring(buildWiringDto())).toEqual({
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

  it("reads the vendor from __typename, not from tool.slug", () => {
    // The slug is an editable label in admin: a drifted one must not change
    // which vendor the configuration is understood to be.
    const wiring = mapToolWiring(buildWiringDto({
      tool: {
        documentId: "tool-1",
        name: "GlitchTip",
        slug: "not-glitchtip-anymore",
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
    }));

    expect(wiring.configuration?.kind).toBe("glitchtip");
  });

  it("maps a PostHog configuration, which carries no organization", () => {
    const wiring = mapToolWiring(buildWiringDto({
      tool: {
        documentId: "tool-2",
        name: "PostHog",
        slug: "posthog",
        configuration: [
          {
            __typename: "ComponentConfigPosthogConfiguration",
            id: "cfg-2",
            url: "https://eu.posthog.com",
            projectId: "9001",
          },
        ],
      },
    }));

    expect(wiring.configuration).toEqual({
      kind: "posthog",
      id: "cfg-2",
      url: "https://eu.posthog.com",
      projectId: "9001",
    });
  });

  it("leaves the configuration undefined when the element has no tool", () => {
    expect(mapToolWiring(buildWiringDto({ tool: null })).configuration).toBeUndefined();
  });

  it("leaves the configuration undefined when the tool's dynamic zone is empty", () => {
    const wiring = mapToolWiring(buildWiringDto({
      tool: {
        documentId: "tool-1",
        name: "GlitchTip",
        slug: "glitchtip",
        configuration: [],
      },
    }));

    expect(wiring.configuration).toBeUndefined();
  });

  it("throws when Strapi could not resolve the configuration component", () => {
    // `Error` is a real member of every dynamic zone union: a fallback here
    // would hide a broken Strapi component behind an unsupported element.
    expect(() =>
      mapToolWiring(buildWiringDto({
        tool: {
          documentId: "tool-1",
          name: "GlitchTip",
          slug: "glitchtip",
          configuration: [
            { __typename: "Error", code: "BAD_COMPONENT", message: "boom" },
          ],
        },
      })),
    ).toThrow(/tool.configuration" dynamic zone: BAD_COMPONENT — boom/);
  });
});
