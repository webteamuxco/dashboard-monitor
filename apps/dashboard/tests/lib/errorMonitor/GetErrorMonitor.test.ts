import { describe, it, expect, beforeEach } from "vitest";
import { getErrorMonitor } from "@/lib/errorMonitor/GetErrorMonitor";

describe("getErrorMonitor", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER;
    delete process.env.GLITCHTIP_URL;
    delete process.env.GLITCHTIP_TOKEN;
    delete process.env.GLITCHTIP_ORGANIZATION_SLUG;
  });

  it("throws when NEXT_PUBLIC_ERROR_MONITOR_DRIVER is not set", () => {
    expect(() => getErrorMonitor()).toThrow(
      /NEXT_PUBLIC_ERROR_MONITOR_DRIVER env variable is not set/,
    );
  });

  it("delegates to the resolver and throws when no factory supports the driver", () => {
    process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER = "sentry";

    expect(() => getErrorMonitor()).toThrow(/No ErrorMonitorFactory supports type "sentry"/);
  });

  it("returns a strategy when driver is 'glitchtip' and env vars are set", () => {
    process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER = "glitchtip";
    process.env.GLITCHTIP_URL = "https://x";
    process.env.GLITCHTIP_TOKEN = "t";
    process.env.GLITCHTIP_ORGANIZATION_SLUG = "org";

    const strategy = getErrorMonitor();

    expect(typeof strategy.getIssues).toBe("function");
    expect(typeof strategy.getErrorStats).toBe("function");
  });
});
