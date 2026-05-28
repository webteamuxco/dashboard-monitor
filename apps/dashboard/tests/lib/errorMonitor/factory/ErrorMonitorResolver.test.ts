import { describe, it, expect, vi } from "vitest";
import { ErrorMonitorResolver } from "@/lib/errorMonitor/factory/ErrorMonitorResolver";
import type { ErrorMonitorFactoryInterface } from "@/lib/errorMonitor/factory/ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "@/lib/errorMonitor/strategy/ErrorMonitorStrategyInterface";

function fakeStrategy(): ErrorMonitorStrategyInterface {
  return {
    getIssues: vi.fn(),
    getErrorStats: vi.fn(),
    getIssue: vi.fn(),
    getIssueLatestEvent: vi.fn(),
    getIssueEvents: vi.fn(),
    getIssueComments: vi.fn(),
  };
}

function fakeFactory(type: string, strategy = fakeStrategy()): ErrorMonitorFactoryInterface {
  return {
    support: (t) => t === type,
    create: () => strategy,
  };
}

describe("ErrorMonitorResolver", () => {
  it("returns the strategy from the first matching factory", () => {
    const strat = fakeStrategy();
    const resolver = new ErrorMonitorResolver([
      fakeFactory("glitchtip", strat),
      fakeFactory("sentry"),
    ]);

    expect(resolver.resolve("glitchtip")).toBe(strat);
  });

  it("throws with the type and registered count when no factory supports it", () => {
    const resolver = new ErrorMonitorResolver([fakeFactory("glitchtip")]);

    expect(() => resolver.resolve("unknown")).toThrow(
      /No ErrorMonitorFactory supports type "unknown".*Registered: 1/,
    );
  });

  it("throws when no factories are registered", () => {
    expect(() => new ErrorMonitorResolver([]).resolve("anything")).toThrow(/Registered: 0/);
  });
});
