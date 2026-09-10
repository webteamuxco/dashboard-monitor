import { describe, it, expect } from "vitest";
import { GlitchtipConfigurationStrategy } from "@/lib/config/domain/tool/GlitchtipConfigurationStrategy";
import { glitchtipWiring, posthogWiring } from "../../../../helpers/toolWiring";

// The strategy no longer reaches Strapi: the wiring is handed to it by the
// data-access layer, so both methods are pure and need no mock at all.
describe("GlitchtipConfigurationStrategy.isConfigure", () => {
  it("supports a wiring that asks for the strategy through glitchtip", () => {
    const supported = new GlitchtipConfigurationStrategy().isConfigure(
      glitchtipWiring(),
      "error-monitor",
    );

    expect(supported).toBe(true);
  });

  it("reports false when the element asks for another strategy", () => {
    const supported = new GlitchtipConfigurationStrategy().isConfigure(
      glitchtipWiring(),
      "tracker-monitor",
    );

    expect(supported).toBe(false);
  });

  it("reports false when the element is wired to another vendor", () => {
    const supported = new GlitchtipConfigurationStrategy().isConfigure(
      posthogWiring({
        strategy: { kind: "error-monitor", id: "s1" },
      }),
      "error-monitor",
    );

    expect(supported).toBe(false);
  });

  it("reports false when the element declares no strategy at all", () => {
    const supported = new GlitchtipConfigurationStrategy().isConfigure(
      glitchtipWiring({ strategy: undefined }),
      "error-monitor",
    );

    expect(supported).toBe(false);
  });
});

describe("GlitchtipConfigurationStrategy.resolveConnection", () => {
  it("resolves the connection from the element's tool configuration", () => {
    const connection = new GlitchtipConfigurationStrategy().resolveConnection(
      glitchtipWiring(),
    );

    expect(connection).toEqual({
      baseUrl: "https://glitchtip.example",
      organizationSlug: "uxco-group",
      projectId: "42",
    });
  });

  it("throws naming the element when it carries no configuration", () => {
    expect(() =>
      new GlitchtipConfigurationStrategy().resolveConnection(
        glitchtipWiring({ id: "kpi-9", configuration: undefined }),
      ),
    ).toThrow('Strapi element "kpi-9" has no GlitchTip configuration.');
  });

  it("throws when the configuration belongs to another vendor", () => {
    expect(() =>
      new GlitchtipConfigurationStrategy().resolveConnection(posthogWiring()),
    ).toThrow(/has no GlitchTip configuration/);
  });

  it.each([
    ["url", { url: "" }],
    ["organization", { organization: null }],
    ["projectId", { projectId: "" }],
  ])("throws when %s is empty, naming what is required", (field, patch) => {
    expect(() =>
      new GlitchtipConfigurationStrategy().resolveConnection(
        glitchtipWiring({
          id: `kpi-incomplete-${field}`,
          configuration: {
            kind: "glitchtip",
            id: "cfg-1",
            url: "https://glitchtip.example",
            projectId: "42",
            organization: "uxco-group",
            ...patch,
          },
        }),
      ),
    ).toThrow(
      /is incomplete \(url, organization and projectId are all required\)/,
    );
  });
});
