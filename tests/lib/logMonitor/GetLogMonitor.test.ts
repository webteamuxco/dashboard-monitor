import { describe, it, expect, beforeEach } from "vitest";
import { getLogMonitor } from "@/lib/logMonitor/GetLogMonitor";

describe("getLogMonitor", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_LOG_MONITOR_DRIVER;
    delete process.env.GLITCHTIP_URL;
    delete process.env.GLITCHTIP_TOKEN;
    delete process.env.GLITCHTIP_ORGANIZATION_SLUG;
  });

  it("throws when NEXT_PUBLIC_LOG_MONITOR_DRIVER is not set", () => {
    expect(() => getLogMonitor()).toThrow(
      /NEXT_PUBLIC_LOG_MONITOR_DRIVER env variable is not set/,
    );
  });

  it("delegates to the resolver and throws when no factory supports the driver", () => {
    process.env.NEXT_PUBLIC_LOG_MONITOR_DRIVER = "loki";

    expect(() => getLogMonitor()).toThrow(/No LogMonitorFactory supports type "loki"/);
  });

  it("returns a strategy when driver is 'glitchtip' and env vars are set", () => {
    process.env.NEXT_PUBLIC_LOG_MONITOR_DRIVER = "glitchtip";
    process.env.GLITCHTIP_URL = "https://x";
    process.env.GLITCHTIP_TOKEN = "t";
    process.env.GLITCHTIP_ORGANIZATION_SLUG = "org";

    const strategy = getLogMonitor();

    expect(typeof strategy.getLogs).toBe("function");
  });
});
