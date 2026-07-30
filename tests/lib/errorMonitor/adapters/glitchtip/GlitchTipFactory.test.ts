import { describe, it, expect, beforeEach } from "vitest";
import { GlitchTipFactory } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorFactory";
import { GlitchTipStrategy } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorStrategy";

const CONNECTION = { baseUrl: "https://x", organizationSlug: "org", projectId: "p" };

describe("GlitchTipFactory", () => {
  let factory: GlitchTipFactory;

  beforeEach(() => {
    factory = new GlitchTipFactory();
    delete process.env.GLITCHTIP_TOKEN;
  });

  describe("support", () => {
    it("matches 'glitchtip'", () => {
      expect(factory.support("glitchtip")).toBe(true);
    });

    it("rejects other types", () => {
      expect(factory.support("sentry")).toBe(false);
      expect(factory.support("")).toBe(false);
    });
  });

  describe("create", () => {
    it("throws when GLITCHTIP_TOKEN is missing", () => {
      expect(() => factory.create(CONNECTION)).toThrow(/GLITCHTIP_TOKEN is required/);
    });

    it("returns a GlitchTipStrategy when the token is set", () => {
      process.env.GLITCHTIP_TOKEN = "t";

      expect(factory.create(CONNECTION)).toBeInstanceOf(GlitchTipStrategy);
    });
  });
});
