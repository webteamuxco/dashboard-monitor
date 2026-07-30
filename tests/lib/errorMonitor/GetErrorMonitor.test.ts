import { describe, it, expect, beforeEach } from "vitest";
import { getErrorMonitor } from "@/lib/errorMonitor/GetErrorMonitor";

const CONNECTION = {
  baseUrl: "https://x",
  organizationSlug: "org",
  projectId: "p",
};

describe("getErrorMonitor", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER;
    delete process.env.GLITCHTIP_TOKEN;
  });

  it("throws when NEXT_PUBLIC_ERROR_MONITOR_DRIVER is not set", () => {
    expect(() => getErrorMonitor(CONNECTION)).toThrow(
      /NEXT_PUBLIC_ERROR_MONITOR_DRIVER env variable is not set/,
    );
  });

  it("delegates to the resolver and throws when no factory supports the driver", () => {
    process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER = "sentry";

    expect(() => getErrorMonitor(CONNECTION)).toThrow(
      /No ErrorMonitorFactory supports type "sentry"/,
    );
  });

  it("returns a strategy when driver is 'glitchtip' and the token is set", () => {
    process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER = "glitchtip";
    process.env.GLITCHTIP_TOKEN = "t";

    const strategy = getErrorMonitor(CONNECTION);

    expect(typeof strategy.getIssues).toBe("function");
    expect(typeof strategy.getErrorStats).toBe("function");
  });
});
