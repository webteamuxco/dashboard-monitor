import { describe, it, expect, beforeEach } from "vitest";
import { getTrackerMonitor } from "@/lib/trackerMonitor/GetTrackerMonitor";

const CONNECTION = {
  baseUrl: "https://x",
  projectId: "1",
};

describe("getTrackerMonitor", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_TRACKER_MONITOR_DRIVER;
    delete process.env.POSTHOG_PERSONAL_API_KEY;
  });

  it("throws when NEXT_PUBLIC_TRACKER_MONITOR_DRIVER is not set", () => {
    expect(() => getTrackerMonitor(CONNECTION)).toThrow(
      /NEXT_PUBLIC_TRACKER_MONITOR_DRIVER env variable is not set/,
    );
  });

  it("delegates to the resolver and throws when no factory supports the driver", () => {
    process.env.NEXT_PUBLIC_TRACKER_MONITOR_DRIVER = "unknown";

    expect(() => getTrackerMonitor(CONNECTION)).toThrow(
      /No TrackerMonitorFactory supports type "unknown"/,
    );
  });

  it("returns a strategy when driver is 'posthog' and the api key is set", () => {
    process.env.NEXT_PUBLIC_TRACKER_MONITOR_DRIVER = "posthog";
    process.env.POSTHOG_PERSONAL_API_KEY = "tok";

    const strategy = getTrackerMonitor(CONNECTION);

    expect(typeof strategy.getActiveUsersTimeline).toBe("function");
  });
});
