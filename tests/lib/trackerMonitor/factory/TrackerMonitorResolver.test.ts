import { describe, it, expect, vi } from "vitest";
import { TrackerMonitorResolver } from "@/lib/trackerMonitor/factory/TrackerMonitorResolver";
import type { TrackerMonitorFactoryInterface } from "@/lib/trackerMonitor/factory/TrackerMonitorFactoryInterface";
import type { TrackerMonitorStrategyInterface } from "@/lib/trackerMonitor/strategy/TrackerMonitorStrategyInterface";
import type { ToolConnection } from "@/lib/config/domain/tool/ToolConnection";

const CONNECTION: ToolConnection = { baseUrl: "https://ph", projectId: "1" };

function fakeStrategy(): TrackerMonitorStrategyInterface {
  return { getActiveUsersTimeline: vi.fn() };
}

function fakeFactory(
  supported: boolean,
  strategy = fakeStrategy(),
): TrackerMonitorFactoryInterface<TrackerMonitorStrategyInterface> {
  return {
    support: vi.fn(async () => supported),
    createConnection: vi.fn(async () => CONNECTION),
    createStrategy: () => strategy,
  };
}

describe("TrackerMonitorResolver", () => {
  it("returns the first factory that supports the project", async () => {
    const supporting = fakeFactory(true);
    const resolver = new TrackerMonitorResolver([fakeFactory(false), supporting]);

    await expect(resolver.resolve("doc1")).resolves.toBe(supporting);
  });

  it("asks each factory for the project's 'tracker-monitor' strategy", async () => {
    const factory = fakeFactory(true);

    await new TrackerMonitorResolver([factory]).resolve("doc1");

    expect(factory.support).toHaveBeenCalledWith("doc1", "tracker-monitor");
  });

  it("rejects when no factory supports the project", async () => {
    const resolver = new TrackerMonitorResolver([fakeFactory(false)]);

    await expect(resolver.resolve("doc1")).rejects.toThrow(
      /No TrackerMonitorFactory supports type "tracker-monitor"/,
    );
  });

  it("rejects when no factories are registered", async () => {
    await expect(new TrackerMonitorResolver([]).resolve("doc1")).rejects.toThrow(
      /Please add missing Mapped tools in admin/,
    );
  });
});
