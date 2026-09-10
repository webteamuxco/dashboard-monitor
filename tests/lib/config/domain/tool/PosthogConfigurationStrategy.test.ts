import { describe, it, expect } from "vitest";
import { PosthogConfigurationStrategy } from "@/lib/config/domain/tool/PosthogConfigurationStrategy";
import { glitchtipWiring, posthogWiring } from "../../../../helpers/toolWiring";

describe("PosthogConfigurationStrategy.isConfigure", () => {
  it("supports a wiring that asks for the strategy through posthog", () => {
    const supported = new PosthogConfigurationStrategy().isConfigure(
      posthogWiring(),
      "tracker-monitor",
    );

    expect(supported).toBe(true);
  });

  it("reports false when the element asks for another strategy", () => {
    const supported = new PosthogConfigurationStrategy().isConfigure(
      posthogWiring(),
      "error-monitor",
    );

    expect(supported).toBe(false);
  });

  it("reports false when the element is wired to another vendor", () => {
    const supported = new PosthogConfigurationStrategy().isConfigure(
      glitchtipWiring({
        strategy: { kind: "tracker-monitor", id: "s2" },
      }),
      "tracker-monitor",
    );

    expect(supported).toBe(false);
  });
});

describe("PosthogConfigurationStrategy.resolveConnection", () => {
  it("resolves a bare ToolConnection — PostHog needs no organization", () => {
    const connection = new PosthogConfigurationStrategy().resolveConnection(
      posthogWiring(),
    );

    expect(connection).toEqual({
      baseUrl: "https://eu.posthog.com",
      projectId: "9001",
    });
  });

  it("throws naming the element when it carries no configuration", () => {
    expect(() =>
      new PosthogConfigurationStrategy().resolveConnection(
        posthogWiring({ id: "kpi-9", configuration: undefined }),
      ),
    ).toThrow('Strapi element "kpi-9" has no PostHog configuration.');
  });

  it("throws when the configuration belongs to another vendor", () => {
    expect(() =>
      new PosthogConfigurationStrategy().resolveConnection(glitchtipWiring()),
    ).toThrow(/has no PostHog configuration/);
  });

  it.each([
    ["url", { url: "" }],
    ["projectId", { projectId: "" }],
  ])("throws when %s is empty, naming what is required", (field, patch) => {
    expect(() =>
      new PosthogConfigurationStrategy().resolveConnection(
        posthogWiring({
          id: `kpi-incomplete-${field}`,
          configuration: {
            kind: "posthog",
            id: "cfg-2",
            url: "https://eu.posthog.com",
            projectId: "9001",
            ...patch,
          },
        }),
      ),
    ).toThrow(/is incomplete \(url and projectId are both required\)/);
  });
});
