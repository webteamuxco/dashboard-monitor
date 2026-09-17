import { describe, it, expect, vi } from "vitest";
import { LogMonitorResolver } from "@/lib/logMonitor/factory/LogMonitorResolver";
import type { LogMonitorFactoryInterface } from "@/lib/logMonitor/factory/LogMonitorFactoryInterface";
import type { LogMonitorStrategyInterface } from "@/lib/logMonitor/strategy/LogMonitorStrategyInterface";
import type { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { glitchtipWiring } from "../../../helpers/toolWiring";

const CONNECTION: ToolConnection = { baseUrl: "https://gt", projectId: "p" };

function fakeStrategy(): LogMonitorStrategyInterface {
  return { 
    getLogs: vi.fn(),
    getBlockMeasures: vi.fn(),
    getKpiMeasures: vi.fn()
  };
}

function fakeFactory(
  supported: boolean,
  strategy = fakeStrategy(),
): LogMonitorFactoryInterface<LogMonitorStrategyInterface> {
  return {
    support: vi.fn(() => supported),
    createConnection: vi.fn(() => CONNECTION),
    createStrategy: () => strategy,
  };
}

describe("LogMonitorResolver", () => {
  it("returns the first factory that supports the element", () => {
    const supporting = fakeFactory(true);
    const resolver = new LogMonitorResolver([fakeFactory(false), supporting]);

    expect(resolver.resolve(glitchtipWiring())).toBe(supporting);
  });

  it("asks each factory for the 'log-monitor' strategy", () => {
    const factory = fakeFactory(true);

    new LogMonitorResolver([factory]).resolve(glitchtipWiring());

    expect(factory.support).toHaveBeenCalledWith("log-monitor");
  });

  it("throws when no factory supports the element", () => {
    const resolver = new LogMonitorResolver([fakeFactory(false)]);

    expect(() => resolver.resolve(glitchtipWiring())).toThrow(
      /No LogMonitorFactory supports type "log-monitor"/,
    );
  });

  it("throws when no factories are registered", () => {
    expect(() => new LogMonitorResolver([]).resolve(glitchtipWiring())).toThrow(
      /Please check its strategy and its tool in admin/,
    );
  });
});
