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

describe("TrackerMonitorResolver", () => {
  it("returns the strategy from the first matching factory", () => {
    const strat = fakeStrategy();
    const resolver = new TrackerMonitorResolver([
      fakeFactory("posthog", strat),
      fakeFactory("mixpanel"),
    ]);

    expect(resolver.resolve("posthog")).toBe(strat);
  });

  it("throws with the type and registered count when no factory supports it", () => {
    const resolver = new TrackerMonitorResolver([fakeFactory("posthog")]);

    expect(() => resolver.resolve("nope")).toThrow(/No TrackerMonitorFactory supports type "nope"/);
    expect(() => resolver.resolve("nope")).toThrow(/Registered: 1/);
  });

  it("throws when no factories are registered", () => {
    const resolver = new TrackerMonitorResolver([]);

    expect(() => resolver.resolve("posthog")).toThrow(/Registered: 0/);
  });
});
