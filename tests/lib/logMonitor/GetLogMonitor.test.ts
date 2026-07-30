import { describe, it, expect, beforeEach } from "vitest";
import { getLogMonitor } from "@/lib/logMonitor/GetLogMonitor";

const CONNECTION = {
  baseUrl: "https://x",
  organizationSlug: "org",
  projectId: "p",
};

describe("getLogMonitor", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_LOG_MONITOR_DRIVER;
    delete process.env.GLITCHTIP_TOKEN;
  });

  it("throws when NEXT_PUBLIC_LOG_MONITOR_DRIVER is not set", () => {
    expect(() => getLogMonitor(CONNECTION)).toThrow(
      /NEXT_PUBLIC_LOG_MONITOR_DRIVER env variable is not set/,
    );
  });

  it("delegates to the resolver and throws when no factory supports the driver", () => {
    process.env.NEXT_PUBLIC_LOG_MONITOR_DRIVER = "loki";

    expect(() => getLogMonitor(CONNECTION)).toThrow(/No LogMonitorFactory supports type "loki"/);
  });

  it("returns a strategy when driver is 'glitchtip' and the token is set", () => {
    process.env.NEXT_PUBLIC_LOG_MONITOR_DRIVER = "glitchtip";
    process.env.GLITCHTIP_TOKEN = "t";

    const strategy = getLogMonitor(CONNECTION);

    expect(typeof strategy.getLogs).toBe("function");
  });
});
