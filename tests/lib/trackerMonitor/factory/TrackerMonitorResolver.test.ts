import { describe, it, expect, vi } from "vitest";
import { TrackerMonitorResolver } from "@/lib/trackerMonitor/factory/TrackerMonitorResolver";
import type { TrackerMonitorFactoryInterface } from "@/lib/trackerMonitor/factory/TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "@/lib/trackerMonitor/strategy/TrackerMonitorStrategyInterface";
import type { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { posthogWiring } from "../../../helpers/toolWiring";

const CONNECTION: ToolConnection = { baseUrl: "https://ph", projectId: "1" };

function fakeStrategy(): TrackerMonitorStrategyInterface {
  return { getActiveUsersTimeline: vi.fn(), getTotalVisitors: vi.fn() };
}

function fakeFactory(
  supported: boolean,
  strategy = fakeStrategy(),
): TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface> {
  return {
    support: vi.fn(() => supported),
    createConnection: vi.fn(() => CONNECTION),
    createStrategy: () => strategy,
  };
}

describe("TrackerMonitorResolver", () => {
  it("returns the first factory that supports the element", () => {
    const supporting = fakeFactory(true);
    const resolver = new TrackerMonitorResolver([fakeFactory(false), supporting]);

    expect(resolver.resolve(posthogWiring())).toBe(supporting);
  });

  it("asks each factory for the 'tracker-monitor' strategy, handing it the wiring", () => {
    const factory = fakeFactory(true);
    const wiring = posthogWiring();

    new TrackerMonitorResolver([factory]).resolve(wiring);

    expect(factory.support).toHaveBeenCalledWith(wiring, "tracker-monitor");
  });

  it("throws when no factory supports the element", () => {
    const resolver = new TrackerMonitorResolver([fakeFactory(false)]);

    expect(() => resolver.resolve(posthogWiring())).toThrow(
      /No TrackerMonitorFactory supports type "tracker-monitor"/,
    );
  });

  it("throws when no factories are registered", () => {
    expect(() => new TrackerMonitorResolver([]).resolve(posthogWiring())).toThrow(
      /Please check its strategy and its tool in admin/,
    );
  });
});
