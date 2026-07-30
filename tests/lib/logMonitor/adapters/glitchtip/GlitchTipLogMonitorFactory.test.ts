import { describe, it, expect, beforeEach } from "vitest";
import { GlitchTipLogMonitorFactory } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorFactory";
import { GlitchTipLogMonitorStrategy } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorStrategy";

const CONNECTION = { baseUrl: "https://x", organizationSlug: "org", projectId: "p" };

describe("GlitchTipLogMonitorFactory", () => {
  let factory: GlitchTipLogMonitorFactory;

  beforeEach(() => {
    factory = new GlitchTipLogMonitorFactory();
    delete process.env.GLITCHTIP_TOKEN;
  });

  describe("support", () => {
    it("matches 'glitchtip'", () => {
      expect(factory.support("glitchtip")).toBe(true);
    });

    it("rejects other types", () => {
      expect(factory.support("loki")).toBe(false);
    });
  });

  describe("create", () => {
    it("throws when GLITCHTIP_TOKEN is missing", () => {
      expect(() => factory.create(CONNECTION)).toThrow(/GLITCHTIP_TOKEN is required/);
    });

    it("returns a GlitchTipLogMonitorStrategy when the token is set", () => {
      process.env.GLITCHTIP_TOKEN = "t";

      expect(factory.create(CONNECTION)).toBeInstanceOf(GlitchTipLogMonitorStrategy);
    });
  });
});
