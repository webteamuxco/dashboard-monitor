import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlitchTipLogMonitorStrategy } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorStrategy";
import type { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";
import type { ToolWiring } from "@/lib/config/domain/ToolWiring";
import type { MonitorStrategyTag } from "@/lib/config/domain/MonitorStrategy";
import { glitchtipWiring } from "../../../../helpers/toolWiring";

const CONNECTION = { baseUrl: "https://gt", organizationSlug: "org", projectId: "p" };

function tag(id: string, name: string, value: string): MonitorStrategyTag {
  return { id, name, value, description: null, color: null };
}

const ONE_TAG = [tag("t1", "reservation", "reservation.sent")];

const TWO_TAGS = [
  tag("t1", "Envoyées", "reservation.sent"),
  tag("t2", "Annulées", "reservation.cancelled"),
];

function logWiring(tags: MonitorStrategyTag[]): ToolWiring {
  return glitchtipWiring({
    strategy: { kind: "log-monitor", id: "s2", tags },
  });
}

describe("GlitchTipLogMonitorStrategy.getLogs", () => {
  let getPaginated: ReturnType<typeof vi.fn>;
  let strategy: GlitchTipLogMonitorStrategy;

  beforeEach(() => {
    const wiring = glitchtipWiring();
    getPaginated = vi.fn().mockResolvedValue([]);
    strategy = new GlitchTipLogMonitorStrategy(
      { getPaginated } as unknown as GlitchTipClient,
      CONNECTION,
      wiring
    );
  });

  it("fetches all pages from the org logs endpoint with project + filters + period", async () => {
    await strategy.getLogs(
      "p1",
      { query: "reservation.sent" },
      { from: "2026-05-28T00:00:00Z", to: "2026-05-28T01:00:00Z", interval: "1m" },
    );

    expect(getPaginated).toHaveBeenCalledWith(
      "/api/0/organizations/org/logs/",
      {
        project: "p1",
        start: "2026-05-28T00:00:00Z",
        end: "2026-05-28T01:00:00Z",
        query: "reservation.sent",
      },
    );
  });

  it("leaves period fields undefined when no period is passed", async () => {
    await strategy.getLogs("p1");

    expect(getPaginated.mock.calls[0][1]).toMatchObject({
      project: "p1",
      start: undefined,
      end: undefined,
      query: undefined,
    });
  });

  it("maps the response through mapGlitchTipLog (fatal collapses to error)", async () => {
    getPaginated.mockResolvedValue([
      { id: "l1", body: "boom", level: "fatal", timestamp: "2026-05-28T00:00:00Z" },
    ]);

    const out = await strategy.getLogs("p1");

    expect(out).toEqual([
      { id: "l1", message: "boom", level: "error", timestamp: "2026-05-28T00:00:00Z" },
    ]);
  });

  it("returns an empty array when the client returns []", async () => {
    expect(await strategy.getLogs("p1")).toEqual([]);
  });
});

function buildStrategy(
  wiring: ToolWiring,
): { strategy: GlitchTipLogMonitorStrategy; getPaginated: ReturnType<typeof vi.fn> } {
  const getPaginated = vi.fn().mockResolvedValue([]);
  return {
    strategy: new GlitchTipLogMonitorStrategy(
      { getPaginated } as unknown as GlitchTipClient,
      CONNECTION,
      wiring,
    ),
    getPaginated,
  };
}

describe("GlitchTipLogMonitorStrategy.getKpiMeasures", () => {
  it("counts the logs matching the strategy's tags", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));
    getPaginated.mockResolvedValue([{ id: "l1" }, { id: "l2" }, { id: "l3" }]);

    expect(await strategy.getKpiMeasures(15, null)).toEqual({
      value: 3,
      windowMinutes: 15,
    });
  });

  it("builds the query from the tags Strapi declares, not from a constant", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));

    await strategy.getKpiMeasures(15, null);

    expect(getPaginated.mock.calls[0][1].query).toBe("reservation.sent");
  });

  // The environment is a suffix of the tag in this project's log naming.
  it("suffixes each tag with the environment", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));

    await strategy.getKpiMeasures(15, "staging");

    expect(getPaginated.mock.calls[0][1].query).toBe(
      "reservation.sent.staging",
    );
  });

  // Several tags are ANDed, which is how the provider reads space-separated
  // terms.
  it("ANDs the terms when the element declares several tags", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));

    await strategy.getKpiMeasures(15, null);

    expect(getPaginated.mock.calls[0][1].query).toBe(
      "reservation.sent reservation.cancelled",
    );
  });

  it("bounds the query with the window it was given", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));

    await strategy.getKpiMeasures(15, null);

    const params = getPaginated.mock.calls[0][1];
    expect(
      new Date(params.end).getTime() - new Date(params.start).getTime(),
    ).toBe(15 * 60_000);
  });

  it("reads the logs with no period, keeping the tag filter", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));
    getPaginated.mockResolvedValue([{ id: "l1" }]);

    expect(await strategy.getKpiMeasures(null, null)).toEqual({
      value: 1,
      windowMinutes: null,
    });
    const params = getPaginated.mock.calls[0][1];
    expect(params.query).toBe("reservation.sent");
    expect(params.start).toBeUndefined();
    expect(params.end).toBeUndefined();
  });

});

// A KPI and a block read the same wiring through the same guard, so neither may
// be laxer than the other: a block once counted the whole project on a tagless
// element while the KPI refused. Each refusal is asserted against both, windowed
// and unwindowed.
describe("GlitchTipLogMonitorStrategy — what both measures refuse", () => {
  const MEASURES: ReadonlyArray<{
    name: string;
    run: (
      strategy: GlitchTipLogMonitorStrategy,
      windowMinutes: number | null,
    ) => Promise<unknown>;
  }> = [
    { name: "getKpiMeasures", run: (s, w) => s.getKpiMeasures(w, null) },
    {
      name: "getBlockMeasures",
      run: (s, w) => s.getBlockMeasures(w, null, null, null),
    },
  ];

  for (const measure of MEASURES) {
    describe(measure.name, () => {
      for (const windowMinutes of [15, null]) {
        const window = windowMinutes === null ? "no window" : "a window";

        // An empty tag list builds an empty query, which the provider reads as
        // "everything".
        it(`refuses a tagless element with ${window}, rather than counting everything`, async () => {
          const { strategy, getPaginated } = buildStrategy(logWiring([]));

          await expect(measure.run(strategy, windowMinutes)).rejects.toThrow(
            /declares no tag: there is nothing to count/,
          );
          expect(getPaginated).not.toHaveBeenCalled();
        });
      }

      it("names the element so the card can be found in admin", async () => {
        const { strategy } = buildStrategy(
          glitchtipWiring({
            id: "element-9",
            strategy: { kind: "log-monitor", id: "s2", tags: [] },
          }),
        );

        await expect(measure.run(strategy, 15)).rejects.toThrow(/"element-9"/);
      });

      it("refuses an element whose strategy is not a log monitor", async () => {
        const { strategy, getPaginated } = buildStrategy(glitchtipWiring());

        await expect(measure.run(strategy, 15)).rejects.toThrow(
          /Expected a LogMonitor strategy/,
        );
        expect(getPaginated).not.toHaveBeenCalled();
      });

      it("refuses an element declaring no strategy at all", async () => {
        const { strategy, getPaginated } = buildStrategy(
          glitchtipWiring({ strategy: undefined }),
        );

        await expect(measure.run(strategy, 15)).rejects.toThrow(
          /declares no strategy/,
        );
        expect(getPaginated).not.toHaveBeenCalled();
      });
    });
  }
});

describe("GlitchTipLogMonitorStrategy.getBlockMeasures", () => {
  it("returns one series shape whichever chart will draw it", async () => {
    const { strategy } = buildStrategy(logWiring(ONE_TAG));

    const measure = await strategy.getBlockMeasures(30, null, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.windowMinutes).toBe(30);
    expect(measure.series).toHaveLength(1);
    expect(measure.series[0].key).toBe("count");
  });

  it("buckets the log timestamps the provider returns", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));
    const now = new Date().toISOString();
    getPaginated.mockResolvedValue([
      { id: "l1", body: "m", level: "info", timestamp: now },
      { id: "l2", body: "m", level: "info", timestamp: now },
    ]);

    const measure = await strategy.getBlockMeasures(30, null, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    const total = measure.series[0].points.reduce(
      (sum, point) => sum + (point.count ?? 0),
      0,
    );
    expect(total).toBe(2);
  });

  // A provider that returns nothing for a quiet bucket would otherwise leave a
  // gap the chart draws as a straight line between two distant points.
  it("fills the quiet buckets so a bar is a real zero, not a gap", async () => {
    const { strategy } = buildStrategy(logWiring(ONE_TAG));

    const measure = await strategy.getBlockMeasures(30, null, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.series[0].points).toHaveLength(30);
    expect(measure.series[0].points.every((point) => point.count === 0)).toBe(
      true,
    );
  });

  it("keeps the buckets coarse on a wide window", async () => {
    const { strategy } = buildStrategy(logWiring(ONE_TAG));

    const measure = await strategy.getBlockMeasures(24 * 60, null, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.interval).toBe("1h");
  });

  it("names the series after the only tag the element declares", async () => {
    const { strategy } = buildStrategy(logWiring(ONE_TAG));

    const measure = await strategy.getBlockMeasures(30, null, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.series[0].label).toBe("reservation");
  });

  describe("a block declaring several log tags", () => {
    it("queries only the selected tag, since the provider ANDs the terms of one query", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));

      await strategy.getBlockMeasures(30, "production", null, "t2");

      expect(getPaginated.mock.calls[0][1].query).toBe(
        "reservation.cancelled.production",
      );
    });

    it("keeps the legacy behaviour when no tag is selected", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));

      await strategy.getBlockMeasures(30, null, null, null);

      expect(getPaginated.mock.calls[0][1].query).toBe(
        "reservation.sent reservation.cancelled",
      );
    });

    // The id comes from the browser: it is matched against the tags the element
    // declares rather than trusted, so nothing the client sends ever reaches
    // the provider query verbatim.
    it("refuses a tag the element does not declare rather than passing it to the provider", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));

      await expect(
        strategy.getBlockMeasures(30, null, null, "reservation.sent OR anything"),
      ).rejects.toThrow(/declares no tag/);
      expect(getPaginated).not.toHaveBeenCalled();
    });
  });

  describe("without a window", () => {
    it("returns the list shape", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));
      getPaginated.mockResolvedValue([
        {
          id: "l1",
          body: "boom",
          level: "info",
          timestamp: "2026-05-28T08:00:00Z",
        },
      ]);

      const measure = await strategy.getBlockMeasures(null, null, 5, null);

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.entries).toHaveLength(1);
      expect(measure.windowMinutes).toBeNull();
    });

    // A log line has no detail sheet to open; an issue does.
    it("marks the list as having no detail sheet", async () => {
      const { strategy } = buildStrategy(logWiring(ONE_TAG));

      const measure = await strategy.getBlockMeasures(null, null, null, null);

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.hasDetail).toBe(false);
    });

    it("keeps the most recent rows, not the first the provider listed", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));
      getPaginated.mockResolvedValue([
        { id: "old", body: "m", level: "info", timestamp: "2026-05-28T08:00:00Z" },
        { id: "new", body: "m", level: "info", timestamp: "2026-05-28T09:00:00Z" },
      ]);

      const measure = await strategy.getBlockMeasures(null, null, 1, null);

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.entries.map((entry) => entry.id)).toEqual(["new"]);
    });
  });
});
