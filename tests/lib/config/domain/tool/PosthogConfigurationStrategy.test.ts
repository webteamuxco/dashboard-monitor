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

import { PosthogConfigurationStrategy } from "@/lib/config/domain/tool/PosthogConfigurationStrategy";
import type { DashboardPanel } from "@/lib/config/domain/DashboardPanels";

function buildPanel(overrides: Partial<DashboardPanel> = {}): DashboardPanel {
  return {
    id: "panel-1",
    name: "audience",
    slug: "audience",
    displayName: "Audience",
    icon: "users",
    order: 1,
    mappedTools: [],
    toolConfigurations: [
      {
        kind: "posthog",
        id: "cfg-1",
        url: "https://eu.posthog.com",
        projectId: "9001",
      },
    ],
    ...overrides,
  };
}

describe("PosthogConfigurationStrategy.isConfigure", () => {
  beforeEach(() => {
    isPanelHasStrategyMock.mockReset();
  });

  it("forwards the panel id, the strategy name and the tool slug", async () => {
    isPanelHasStrategyMock.mockResolvedValue(true);

    const supported = await new PosthogConfigurationStrategy().isConfigure(
      "ph-is-configure-1",
      "tracker-monitor",
      "posthog",
    );

    expect(isPanelHasStrategyMock).toHaveBeenCalledWith(
      "ph-is-configure-1",
      "tracker-monitor",
      "posthog",
    );
    expect(supported).toBe(true);
  });
});

describe("PosthogConfigurationStrategy.resolveConnection", () => {
  beforeEach(() => {
    getPanelByIdMock.mockReset();
  });

  it("resolves a bare ToolConnection — PostHog needs no organization", async () => {
    getPanelByIdMock.mockResolvedValue(buildPanel());

    const connection = await new PosthogConfigurationStrategy()
      .resolveConnection("ph-resolve-1");

    expect(connection).toEqual({
      baseUrl: "https://eu.posthog.com",
      projectId: "9001",
    });
    expect(connection).not.toHaveProperty("organizationSlug");
  });

  it("throws when the panel does not exist", async () => {
    getPanelByIdMock.mockResolvedValue(null);

    await expect(
      new PosthogConfigurationStrategy().resolveConnection("ph-resolve-2"),
    ).rejects.toThrow(/"ph-resolve-2" not found\./);
  });

  it("throws when the panel has no PostHog configuration", async () => {
    getPanelByIdMock.mockResolvedValue(buildPanel({ toolConfigurations: [] }));

    await expect(
      new PosthogConfigurationStrategy().resolveConnection("ph-resolve-3"),
    ).rejects.toThrow(
      'Strapi panel "ph-resolve-3" has no PostHog configuration.',
    );
  });

  it.each([
    ["url", { url: "" }],
    ["projectId", { projectId: "" }],
  ])("throws when %s is empty", async (field, patch) => {
    getPanelByIdMock.mockResolvedValue(
      buildPanel({
        toolConfigurations: [
          {
            kind: "posthog",
            id: "cfg-1",
            url: "https://eu.posthog.com",
            projectId: "9001",
            ...patch,
          },
        ],
      }),
    );

    await expect(
      new PosthogConfigurationStrategy().resolveConnection(
        `ph-incomplete-${field}`,
      ),
    ).rejects.toThrow(/is incomplete \(url and projectId are both required\)/);
  });
});
