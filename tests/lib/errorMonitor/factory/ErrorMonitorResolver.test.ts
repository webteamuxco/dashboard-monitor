import { describe, it, expect, vi } from "vitest";
import { ErrorMonitorResolver } from "@/lib/errorMonitor/factory/ErrorMonitorResolver";
import type { ErrorMonitorFactoryInterface } from "@/lib/errorMonitor/factory/ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "@/lib/errorMonitor/strategy/ErrorMonitorStrategyInterface";
import type { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";

const CONNECTION: ToolConnection = { baseUrl: "https://gt", projectId: "p" };

function fakeStrategy(): ErrorMonitorStrategyInterface {
  return {
    getIssues: vi.fn(),
    getErrorStats: vi.fn(),
    getIssue: vi.fn(),
    getIssueLatestEvent: vi.fn(),
    getIssueEvents: vi.fn(),
    getIssueComments: vi.fn(),
    createIssueComment: vi.fn(),
  };
}

function fakeFactory(
  supported: boolean,
  strategy = fakeStrategy(),
): ErrorMonitorFactoryInterface<ErrorMonitorStrategyInterface> {
  return {
    support: vi.fn(async () => supported),
    createConnection: vi.fn(async () => CONNECTION),
    createStrategy: () => strategy,
  };
}

describe("ErrorMonitorResolver", () => {
  it("returns the first factory that supports the project", async () => {
    const supporting = fakeFactory(true);
    const resolver = new ErrorMonitorResolver([fakeFactory(false), supporting]);

    await expect(resolver.resolve("doc1")).resolves.toBe(supporting);
  });

  it("asks each factory for the project's 'error-monitor' strategy", async () => {
    const factory = fakeFactory(true);

    await new ErrorMonitorResolver([factory]).resolve("doc1");

    expect(factory.support).toHaveBeenCalledWith("doc1", "error-monitor");
  });

  it("rejects when no factory supports the project", async () => {
    const resolver = new ErrorMonitorResolver([fakeFactory(false)]);

    await expect(resolver.resolve("doc1")).rejects.toThrow(
      /No ErrorMonitorFactory supports type "error-monitor"/,
    );
  });

  it("rejects when no factories are registered", async () => {
    await expect(new ErrorMonitorResolver([]).resolve("doc1")).rejects.toThrow(
      /Please add missing Mapped tools in admin/,
    );
  });
});
