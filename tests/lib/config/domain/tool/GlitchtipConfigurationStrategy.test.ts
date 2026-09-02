import { describe, it, expect, vi, beforeEach } from "vitest";

const isPanelHasStrategyMock = vi.fn();
const getPanelByIdMock = vi.fn();

vi.mock("@/lib/config/domain/StrapiClientFactory", () => ({
  StrapiClientFactory: class {
    create() {
      return {
        isPanelHasStrategy: isPanelHasStrategyMock,
        getPanelById: getPanelByIdMock,
      };
    }
  },
}));

import { GlitchtipConfigurationStrategy } from "@/lib/config/domain/tool/GlitchtipConfigurationStrategy";
import type { DashboardPanel } from "@/lib/config/domain/DashboardPanels";

function buildPanel(overrides: Partial<DashboardPanel> = {}): DashboardPanel {
  return {
    id: "panel-1",
    name: "production",
    slug: "production",
    displayName: "Production",
    icon: "activity",
    order: 1,
    mappedTools: [],
    toolConfigurations: [
      {
        kind: "glitchtip",
        id: "cfg-1",
        url: "https://glitchtip.example",
        projectId: "42",
        organization: "uxco-group",
        toolSlug: "glitchtip",
      },
    ],
    ...overrides,
  };
}

// isConfigure / resolveConnection are wrapped in React cache(), which only
// dedupes inside a React request context. Distinct panel ids per case keep the
// assertions independent of that either way.
describe("GlitchtipConfigurationStrategy.isConfigure", () => {
  beforeEach(() => {
    isPanelHasStrategyMock.mockReset();
  });

  it("forwards the panel id, the strategy name and the tool slug", async () => {
    isPanelHasStrategyMock.mockResolvedValue(true);

    const supported = await new GlitchtipConfigurationStrategy().isConfigure(
      "panel-is-configure-1",
      "error-monitor",
      "glitchtip",
    );

    expect(isPanelHasStrategyMock).toHaveBeenCalledWith(
      "panel-is-configure-1",
      "error-monitor",
      "glitchtip",
    );
    expect(supported).toBe(true);
  });

  it("reports false when the panel maps nothing", async () => {
    isPanelHasStrategyMock.mockResolvedValue(false);

    await expect(
      new GlitchtipConfigurationStrategy().isConfigure(
        "panel-is-configure-2",
        "error-monitor",
        "glitchtip",
      ),
    ).resolves.toBe(false);
  });
});

describe("GlitchtipConfigurationStrategy.resolveConnection", () => {
  beforeEach(() => {
    getPanelByIdMock.mockReset();
  });

  it("resolves the connection from the panel's tool configuration", async () => {
    getPanelByIdMock.mockResolvedValue(buildPanel());

    const connection = await new GlitchtipConfigurationStrategy()
      .resolveConnection("panel-resolve-1");

    expect(getPanelByIdMock).toHaveBeenCalledWith("panel-resolve-1");
    expect(connection).toEqual({
      baseUrl: "https://glitchtip.example",
      organizationSlug: "uxco-group",
      projectId: "42",
    });
  });

  it("ignores tool configurations of other vendors", async () => {
    getPanelByIdMock.mockResolvedValue(
      buildPanel({
        toolConfigurations: [
          {
            kind: "posthog",
            id: "cfg-2",
            url: "https://eu.posthog.com",
            projectId: "9001",
          },
          {
            kind: "glitchtip",
            id: "cfg-1",
            url: "https://glitchtip.example",
            projectId: "42",
            organization: "uxco-group",
            toolSlug: "glitchtip",
          },
        ],
      }),
    );

    await expect(
      new GlitchtipConfigurationStrategy().resolveConnection("panel-resolve-2"),
    ).resolves.toMatchObject({ projectId: "42" });
  });

  it("throws naming the panel when it does not exist", async () => {
    getPanelByIdMock.mockResolvedValue(null);

    await expect(
      new GlitchtipConfigurationStrategy().resolveConnection("panel-resolve-3"),
    ).rejects.toThrow('Strapi panel "panel-resolve-3" not found.');
  });

  it("throws when the panel has no GlitchTip configuration", async () => {
    getPanelByIdMock.mockResolvedValue(buildPanel({ toolConfigurations: [] }));

    await expect(
      new GlitchtipConfigurationStrategy().resolveConnection("panel-resolve-4"),
    ).rejects.toThrow(
      'Strapi panel "panel-resolve-4" has no GlitchTip configuration.',
    );
  });

  it.each([
    ["url", { url: "" }],
    ["organization", { organization: "" }],
    ["projectId", { projectId: "" }],
  ])("throws when %s is empty, naming what is required", async (field, patch) => {
    getPanelByIdMock.mockResolvedValue(
      buildPanel({
        toolConfigurations: [
          {
            kind: "glitchtip",
            id: "cfg-1",
            url: "https://glitchtip.example",
            projectId: "42",
            organization: "uxco-group",
            toolSlug: "glitchtip",
            ...patch,
          },
        ],
      }),
    );

    await expect(
      new GlitchtipConfigurationStrategy().resolveConnection(
        `panel-incomplete-${field}`,
      ),
    ).rejects.toThrow(
      /is incomplete \(url, organization and projectId are all required\)/,
    );
  });
});
