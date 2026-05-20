import { describe, it, expect, vi, beforeEach } from "vitest";

const isConfigureMock = vi.fn();
const resolveConnectionMock = vi.fn();

vi.mock("@/lib/config/domain/tool/GlitchtipConfigurationStrategy", () => ({
  GlitchtipConfigurationStrategy: class {
    isConfigure = isConfigureMock;
    resolveConnection = resolveConnectionMock;
  },
}));

import { GlitchTipFactory } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorFactory";
import { GlitchTipErrorMonitorStrategy } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorStrategy";

const CONNECTION = { baseUrl: "https://gt", organizationSlug: "org", projectId: "p" };

describe("GlitchTipFactory", () => {
  let factory: GlitchTipFactory;

  beforeEach(() => {
    factory = new GlitchTipFactory();
    isConfigureMock.mockReset();
    resolveConnectionMock.mockReset();
    delete process.env.GLITCHTIP_TOKEN;
  });

  describe("support", () => {
    it("asks Strapi whether the project maps glitchtip to the given strategy", async () => {
      isConfigureMock.mockResolvedValue(true);

      await expect(factory.support("doc1", "error-monitor")).resolves.toBe(true);
      expect(isConfigureMock).toHaveBeenCalledWith("doc1", "error-monitor", "glitchtip");
    });

    it("returns false when the project does not map glitchtip", async () => {
      isConfigureMock.mockResolvedValue(false);

      await expect(factory.support("doc1", "error-monitor")).resolves.toBe(false);
    });
  });

  describe("createConnection", () => {
    it("delegates to the GlitchTip configuration strategy", async () => {
      resolveConnectionMock.mockResolvedValue(CONNECTION);

      await expect(factory.createConnection("doc1")).resolves.toEqual(CONNECTION);
      expect(resolveConnectionMock).toHaveBeenCalledWith("doc1");
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

    it("returns a GlitchTipErrorMonitorStrategy when the token is set", () => {
      process.env.GLITCHTIP_TOKEN = "t";

      expect(factory.createStrategy(CONNECTION)).toBeInstanceOf(GlitchTipErrorMonitorStrategy);
    });
  });
});
