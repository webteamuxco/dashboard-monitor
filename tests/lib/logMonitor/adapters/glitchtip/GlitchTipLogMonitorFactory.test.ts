import { describe, it, expect, beforeEach } from "vitest";
import { GlitchTipLogMonitorFactory } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorFactory";
import { GlitchTipLogMonitorStrategy } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorStrategy";

describe("GlitchTipLogMonitorFactory", () => {
  let factory: GlitchTipLogMonitorFactory;

  beforeEach(() => {
    factory = new GlitchTipLogMonitorFactory();
    delete process.env.GLITCHTIP_URL;
    delete process.env.GLITCHTIP_TOKEN;
    delete process.env.GLITCHTIP_ORGANIZATION_SLUG;
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
    it.each([
      ["GLITCHTIP_URL", { GLITCHTIP_TOKEN: "t", GLITCHTIP_ORGANIZATION_SLUG: "o" }],
      ["GLITCHTIP_TOKEN", { GLITCHTIP_URL: "https://x", GLITCHTIP_ORGANIZATION_SLUG: "o" }],
      ["GLITCHTIP_ORGANIZATION_SLUG", { GLITCHTIP_URL: "https://x", GLITCHTIP_TOKEN: "t" }],
    ])("throws when %s is missing", (_missing, present) => {
      Object.assign(process.env, present);
      expect(() => factory.create()).toThrow(/GlitchTip env vars missing/);
    });

    it("returns a GlitchTipLogMonitorStrategy when all env vars are set", () => {
      process.env.GLITCHTIP_URL = "https://x";
      process.env.GLITCHTIP_TOKEN = "t";
      process.env.GLITCHTIP_ORGANIZATION_SLUG = "org";

      expect(factory.create()).toBeInstanceOf(GlitchTipLogMonitorStrategy);
    });
  });
});
