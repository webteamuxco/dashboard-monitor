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
import { posthogWiring } from "../../helpers/toolWiring";

describe("getTrackerMonitor", () => {
  beforeEach(() => {
    isConfigureMock.mockReset();
  });

  it("resolves the PostHog factory when the element wires posthog to the tracker monitor", () => {
    isConfigureMock.mockReturnValue(true);
    const wiring = posthogWiring();

    expect(getTrackerMonitor(wiring)).toBeInstanceOf(PostHogFactory);
    expect(isConfigureMock).toHaveBeenCalledWith(wiring, "tracker-monitor");
  });

  it("throws when the element has no tracker monitor wired in admin", () => {
    isConfigureMock.mockReturnValue(false);

    expect(() => getTrackerMonitor(posthogWiring())).toThrow(
      /No TrackerMonitorFactory supports type "tracker-monitor"/,
    );
  });
});
