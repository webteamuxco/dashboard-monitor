import { describe, it, expect, vi } from "vitest";
import { ErrorMonitorResolver } from "@/lib/errorMonitor/factory/ErrorMonitorResolver";
import type { ErrorMonitorFactoryInterface } from "@/lib/errorMonitor/factory/ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "@/lib/errorMonitor/strategy/ErrorMonitorStrategyInterface";
import type { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";
import { glitchtipWiring } from "../../../helpers/toolWiring";

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
    support: vi.fn(() => supported),
    createConnection: vi.fn(() => CONNECTION),
    createStrategy: () => strategy,
  };
}

describe("ErrorMonitorResolver", () => {
  it("returns the first factory that supports the element", () => {
    const supporting = fakeFactory(true);
    const resolver = new ErrorMonitorResolver([fakeFactory(false), supporting]);

    expect(resolver.resolve(glitchtipWiring())).toBe(supporting);
  });

  it("asks each factory for the 'error-monitor' strategy, handing it the wiring", () => {
    const factory = fakeFactory(true);
    const wiring = glitchtipWiring();

    new ErrorMonitorResolver([factory]).resolve(wiring);

    expect(factory.support).toHaveBeenCalledWith(wiring, "error-monitor");
  });

  it("throws when no factory supports the element", () => {
    const resolver = new ErrorMonitorResolver([fakeFactory(false)]);

    expect(() => resolver.resolve(glitchtipWiring())).toThrow(
      /No ErrorMonitorFactory supports type "error-monitor"/,
    );
  });

  it("throws when no factories are registered", () => {
    expect(() => new ErrorMonitorResolver([]).resolve(glitchtipWiring())).toThrow(
      /Please check its strategy and its tool in admin/,
    );
  });
});
