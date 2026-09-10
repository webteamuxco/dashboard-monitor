import { describe, it, expect, vi, beforeEach } from "vitest";

const isConfigureMock = vi.fn();
const resolveConnectionMock = vi.fn();

vi.mock("@/lib/config/domain/tool/GlitchtipConfigurationStrategy", () => ({
  GlitchtipConfigurationStrategy: class {
    isConfigure = isConfigureMock;
    resolveConnection = resolveConnectionMock;
  },
}));

import { GlitchTipLogMonitorFactory } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorFactory";
import { GlitchTipLogMonitorStrategy } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorStrategy";
import { glitchtipWiring } from "../../../../helpers/toolWiring";

const CONNECTION = { baseUrl: "https://gt", organizationSlug: "org", projectId: "p" };

describe("GlitchTipLogMonitorFactory", () => {
  let factory: GlitchTipLogMonitorFactory;

  beforeEach(() => {
    factory = new GlitchTipLogMonitorFactory();
    isConfigureMock.mockReset();
    resolveConnectionMock.mockReset();
    delete process.env.GLITCHTIP_TOKEN;
  });

  describe("support", () => {
    it("asks the configuration strategy whether the wiring names glitchtip", () => {
      isConfigureMock.mockReturnValue(true);
      const wiring = glitchtipWiring();

      expect(factory.support(wiring, "log-monitor")).toBe(true);
      expect(isConfigureMock).toHaveBeenCalledWith(wiring, "log-monitor");
    });

    it("returns false when the element does not wire glitchtip", () => {
      isConfigureMock.mockReturnValue(false);

      expect(factory.support(glitchtipWiring(), "log-monitor")).toBe(false);
    });
  });

  describe("createConnection", () => {
    it("delegates to the GlitchTip configuration strategy", () => {
      resolveConnectionMock.mockReturnValue(CONNECTION);
      const wiring = glitchtipWiring();

      expect(factory.createConnection(wiring)).toEqual(CONNECTION);
      expect(resolveConnectionMock).toHaveBeenCalledWith(wiring);
    });
  });

  describe("createStrategy", () => {
    it("rejects a connection that carries no organization slug", () => {
      process.env.GLITCHTIP_TOKEN = "t";

      expect(() => factory.createStrategy({ baseUrl: "https://gt", projectId: "p" })).toThrow(
        /Expected a GlitchtipConnection/,
      );
    });

    it("throws when GLITCHTIP_TOKEN is missing", () => {
      expect(() => factory.createStrategy(CONNECTION)).toThrow(/GLITCHTIP_TOKEN is required/);
    });

    it("returns a GlitchTipLogMonitorStrategy when the token is set", () => {
      process.env.GLITCHTIP_TOKEN = "t";

      expect(factory.createStrategy(CONNECTION)).toBeInstanceOf(GlitchTipLogMonitorStrategy);
    });
  });
});
