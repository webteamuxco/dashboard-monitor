import { describe, it, expect } from "vitest";
import { mapMonitorStrategy } from "@/lib/config/domain/mappers/monitorStrategyMapper";

describe("mapMonitorStrategy", () => {
  it("maps an error monitor strategy", () => {
    // The component carries nothing but its id: the card type lives on the
    // element itself (DashboardKpi.type), not on the strategy.
    expect(
      mapMonitorStrategy([
        { __typename: "ComponentStrategyErrorMonitor", id: "s1" },
      ]),
    ).toEqual({ kind: "error-monitor", id: "s1" });
  });

  it("maps a log monitor strategy with its tags", () => {
    expect(
      mapMonitorStrategy([
        {
          __typename: "ComponentStrategyLogMonitor",
          id: "s2",
          tags: [
            { id: "t1", name: "reservation", value: "reservation.sent", description: null },
          ],
        },
      ]),
    ).toEqual({
      kind: "log-monitor",
      id: "s2",
      tags: [
        { id: "t1", name: "reservation", value: "reservation.sent", description: null },
      ],
    });
  });

  it("drops the null holes Strapi can leave in a tag list", () => {
    const strategy = mapMonitorStrategy([
      { __typename: "ComponentStrategyLogMonitor", id: "s2", tags: [null] },
    ]);

    expect(strategy).toEqual({ kind: "log-monitor", id: "s2", tags: [] });
  });

  it("maps a tracker monitor strategy", () => {
    expect(
      mapMonitorStrategy([
        { __typename: "ComponentStrategyTrackerMonitor", id: "s3" },
      ]),
    ).toEqual({ kind: "tracker-monitor", id: "s3" });
  });

  it("reads the first entry — an element declares one strategy", () => {
    const strategy = mapMonitorStrategy([
      { __typename: "ComponentStrategyTrackerMonitor", id: "first" },
      { __typename: "ComponentStrategyErrorMonitor", id: "second" },
    ]);

    expect(strategy).toEqual({ kind: "tracker-monitor", id: "first" });
  });

  it("returns undefined when the dynamic zone is empty", () => {
    expect(mapMonitorStrategy([])).toBeUndefined();
  });

  it("returns undefined when the only entry is null", () => {
    expect(mapMonitorStrategy([null])).toBeUndefined();
  });

  it("throws when Strapi could not resolve the strategy component", () => {
    expect(() =>
      mapMonitorStrategy([
        { __typename: "Error", code: "BAD_COMPONENT", message: null },
      ]),
    ).toThrow(/"strategy" dynamic zone: BAD_COMPONENT/);
  });
});
