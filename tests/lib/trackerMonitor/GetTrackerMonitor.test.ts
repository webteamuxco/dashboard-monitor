import { describe, it, expect, vi, beforeEach } from "vitest";

const isConfigureMock = vi.fn();
const resolveConnectionMock = vi.fn();

vi.mock("@/lib/config/domain/tool/PosthogConfigurationStrategy", () => ({
  PosthogConfigurationStrategy: class {
    isConfigure = isConfigureMock;
    resolveConnection = resolveConnectionMock;
  },
}));

import { getTrackerMonitor } from "@/lib/trackerMonitor/GetTrackerMonitor";
import { PostHogFactory } from "@/lib/trackerMonitor/adapters/posthog/PostHogFactory";

describe("getTrackerMonitor", () => {
  beforeEach(() => {
    isConfigureMock.mockReset();
  });

  it("resolves the PostHog factory when the project maps posthog to the tracker monitor", async () => {
    isConfigureMock.mockResolvedValue(true);

    await expect(getTrackerMonitor("doc1")).resolves.toBeInstanceOf(PostHogFactory);
    expect(isConfigureMock).toHaveBeenCalledWith("doc1", "tracker-monitor", "posthog");
  });

  it("rejects when the project has no tracker monitor mapped in admin", async () => {
    isConfigureMock.mockResolvedValue(false);

    await expect(getTrackerMonitor("doc1")).rejects.toThrow(
      /No TrackerMonitorFactory supports type "tracker-monitor"/,
    );
  });
});
