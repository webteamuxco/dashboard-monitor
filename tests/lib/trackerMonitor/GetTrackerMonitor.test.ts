import { describe, it, expect, beforeEach } from "vitest";
import { getTrackerMonitor } from "@/lib/trackerMonitor/GetTrackerMonitor";

describe("getTrackerMonitor", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_TRACKER_MONITOR_DRIVER;
    delete process.env.POSTHOG_HOST;
    delete process.env.POSTHOG_PERSONAL_API_KEY;
    delete process.env.POSTHOG_PROJECT_ID;
  });

  it("throws when NEXT_PUBLIC_TRACKER_MONITOR_DRIVER is not set", () => {
    expect(() => getTrackerMonitor()).toThrow(/NEXT_PUBLIC_TRACKER_MONITOR_DRIVER env variable is not set/);
  });

  it("delegates to the resolver and throws when no factory supports the driver", () => {
    process.env.NEXT_PUBLIC_TRACKER_MONITOR_DRIVER = "unknown";

    expect(() => getTrackerMonitor()).toThrow(/No TrackerMonitorFactory supports type "unknown"/);
  });

  it("returns a strategy when driver is 'posthog' and env vars are set", () => {
    process.env.NEXT_PUBLIC_TRACKER_MONITOR_DRIVER = "posthog";
    process.env.POSTHOG_HOST = "https://x";
    process.env.POSTHOG_PERSONAL_API_KEY = "tok";
    process.env.POSTHOG_PROJECT_ID = "1";

    const strategy = getTrackerMonitor();

    expect(typeof strategy.getActiveUsersTimeline).toBe("function");
  });
});
