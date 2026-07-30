import { describe, it, expect, vi } from "vitest";
import { TrackerMonitorResolver } from "@/lib/trackerMonitor/factory/TrackerMonitorResolver";
import type { TrackerMonitorFactoryInterface } from "@/lib/trackerMonitor/factory/TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "@/lib/trackerMonitor/strategy/TrackerMonitorStrategyInterface";

function fakeStrategy(): TrackerMonitorStrategyInterface {
  return { getActiveUsersTimeline: vi.fn() } as unknown as TrackerMonitorStrategyInterface;
}

function fakeFactory(type: string, strategy = fakeStrategy()): TrackerMonitorFactoryInterface {
  return {
    support: (t) => t === type,
    create: () => strategy,
  };
}

const CONNECTION = { baseUrl: "https://x", projectId: "1" };

describe("TrackerMonitorResolver", () => {
  it("returns the strategy from the first matching factory", () => {
    const strat = fakeStrategy();
    const resolver = new TrackerMonitorResolver([
      fakeFactory("posthog", strat),
      fakeFactory("mixpanel"),
    ]);

    expect(resolver.resolve("posthog", CONNECTION)).toBe(strat);
  });

  it("throws with the type and registered count when no factory supports it", () => {
    const resolver = new TrackerMonitorResolver([fakeFactory("posthog")]);

    expect(() => resolver.resolve("nope", CONNECTION)).toThrow(
      /No TrackerMonitorFactory supports type "nope"/,
    );
    expect(() => resolver.resolve("nope", CONNECTION)).toThrow(/Registered: 1/);
  });

  it("throws when no factories are registered", () => {
    const resolver = new TrackerMonitorResolver([]);

    expect(() => resolver.resolve("posthog", CONNECTION)).toThrow(/Registered: 0/);
  });
});
