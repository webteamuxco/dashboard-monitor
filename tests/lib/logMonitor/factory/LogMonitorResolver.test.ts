import { describe, it, expect, vi } from "vitest";
import { LogMonitorResolver } from "@/lib/logMonitor/factory/LogMonitorResolver";
import type { LogMonitorFactoryInterface } from "@/lib/logMonitor/factory/LogMonitorFactoryInterface";
import type { LogMonitorStrategyInterface } from "@/lib/logMonitor/strategy/LogMonitorStrategyInterface";
import type { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";

const CONNECTION: ToolConnection = { baseUrl: "https://gt", projectId: "p" };

function fakeStrategy(): LogMonitorStrategyInterface {
  return { getLogs: vi.fn() };
}

function fakeFactory(
  supported: boolean,
  strategy = fakeStrategy(),
): LogMonitorFactoryInterface<LogMonitorStrategyInterface> {
  return {
    support: vi.fn(async () => supported),
    createConnection: vi.fn(async () => CONNECTION),
    createStrategy: () => strategy,
  };
}

describe("LogMonitorResolver", () => {
  it("returns the first factory that supports the project", async () => {
    const supporting = fakeFactory(true);
    const resolver = new LogMonitorResolver([fakeFactory(false), supporting]);

    await expect(resolver.resolve("doc1")).resolves.toBe(supporting);
  });

  it("asks each factory for the project's 'log-monitor' strategy", async () => {
    const factory = fakeFactory(true);

    await new LogMonitorResolver([factory]).resolve("doc1");

    expect(factory.support).toHaveBeenCalledWith("doc1", "log-monitor");
  });

  it("rejects when no factory supports the project", async () => {
    const resolver = new LogMonitorResolver([fakeFactory(false)]);

    await expect(resolver.resolve("doc1")).rejects.toThrow(
      /No LogMonitorFactory supports type "log-monitor"/,
    );
  });

  it("rejects when no factories are registered", async () => {
    await expect(new LogMonitorResolver([]).resolve("doc1")).rejects.toThrow(
      /Please add missing Mapped tools in admin/,
    );
  });
});
