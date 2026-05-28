import { describe, it, expect, vi } from "vitest";
import { LogMonitorResolver } from "@/lib/logMonitor/factory/LogMonitorResolver";
import type { LogMonitorFactoryInterface } from "@/lib/logMonitor/factory/LogMonitorFactoryInterface";
import type { LogMonitorStrategyInterface } from "@/lib/logMonitor/strategy/LogMonitorStrategyInterface";

function fakeStrategy(): LogMonitorStrategyInterface {
  return { getLogs: vi.fn() };
}

function fakeFactory(type: string, strategy = fakeStrategy()): LogMonitorFactoryInterface {
  return {
    support: (t) => t === type,
    create: () => strategy,
  };
}

describe("LogMonitorResolver", () => {
  it("returns the strategy from the first matching factory", () => {
    const strat = fakeStrategy();
    const resolver = new LogMonitorResolver([
      fakeFactory("glitchtip", strat),
      fakeFactory("loki"),
    ]);

    expect(resolver.resolve("glitchtip")).toBe(strat);
  });

  it("throws with the type and registered count when no factory supports it", () => {
    const resolver = new LogMonitorResolver([fakeFactory("glitchtip")]);

    expect(() => resolver.resolve("foo")).toThrow(
      /No LogMonitorFactory supports type "foo".*Registered: 1/,
    );
  });

  it("throws when no factories are registered", () => {
    expect(() => new LogMonitorResolver([]).resolve("x")).toThrow(/Registered: 0/);
  });
});
