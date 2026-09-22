import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlitchTipLogMonitorStrategy } from "@/lib/logMonitor/adapters/glitchtip/GlitchTipLogMonitorStrategy";
import type { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";
import type { ToolWiring } from "@/lib/config/domain/ToolWiring";
import type { MonitorStrategyTag } from "@/lib/config/domain/MonitorStrategy";
import { LEVELS } from "@/lib/config/domain/Level";
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

  it("builds the service filter from the tags Strapi declares, not from a constant", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));

    await strategy.getKpiMeasures(15, null);

    expect(getPaginated.mock.calls[0][1].service).toBe("reservation.sent");
  });

  it("passes the environment as its own filter rather than as a tag suffix", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));

    await strategy.getKpiMeasures(15, "staging");

    const params = getPaginated.mock.calls[0][1];
    expect(params.service).toBe("reservation.sent");
    expect(params.environment).toBe("staging");
  });

  it("asks one query per tag rather than joining their terms", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));

    await strategy.getKpiMeasures(15, null);

    expect(getPaginated).toHaveBeenCalledTimes(2);
    expect(getPaginated.mock.calls.map((call) => call[1].service)).toEqual([
      "reservation.sent",
      "reservation.cancelled",
    ]);
  });

  it("sums every tag into the value", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));
    getPaginated.mockImplementation((_path: string, params: { service: string }) =>
      Promise.resolve(
        params.service === "reservation.sent"
          ? [{ id: "a" }, { id: "b" }]
          : [{ id: "c" }],
      ),
    );

    expect((await strategy.getKpiMeasures(15, null)).value).toBe(3);
  });

  describe("the breakdown", () => {
    const DESCRIBED = [
      { ...TWO_TAGS[0], description: "Réussie", color: LEVELS.NOTICE },
      { ...TWO_TAGS[1], description: "Echecs", color: LEVELS.ALERT },
    ];

    it("splits the value per tag, labelled by the tag's description", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(DESCRIBED));
      getPaginated.mockImplementation((_path: string, params: { service: string }) =>
        Promise.resolve(
          params.service === "reservation.sent"
            ? [{ id: "a" }, { id: "b" }]
            : [{ id: "c" }, { id: "d" }],
        ),
      );

      expect((await strategy.getKpiMeasures(15, null)).breakdown).toEqual([
        { key: "t1", label: "Réussie", value: 2, color: LEVELS.NOTICE },
        { key: "t2", label: "Echecs", value: 2, color: LEVELS.ALERT },
      ]);
    });

    // `description` is optional in Strapi admin, and a card with a bare count
    // and no word next to it says nothing.
    it("falls back to the tag's name when it carries no description", async () => {
      const { strategy } = buildStrategy(logWiring(TWO_TAGS));

      const measure = await strategy.getKpiMeasures(15, null);

      expect(measure.breakdown?.map((entry) => entry.label)).toEqual([
        "Envoyées",
        "Annulées",
      ]);
    });

    it("leaves it out for a single-tag element, which has nothing to split", async () => {
      const { strategy } = buildStrategy(logWiring(ONE_TAG));

      expect(
        (await strategy.getKpiMeasures(15, null)).breakdown,
      ).toBeUndefined();
    });

    // The total is what the card prints in its caption, and what any consumer
    // ignoring the breakdown reads.
    it("always sums to the value", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(DESCRIBED));
      getPaginated.mockImplementation((_path: string, params: { service: string }) =>
        Promise.resolve(
          params.service === "reservation.sent" ? [{ id: "a" }] : [{ id: "b" }, { id: "c" }],
        ),
      );

      const measure = await strategy.getKpiMeasures(15, null);

      expect(
        measure.breakdown?.reduce((sum, entry) => sum + entry.value, 0),
      ).toBe(measure.value);
    });
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
    expect(params.service).toBe("reservation.sent");
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
      run: (s, w) => s.getBlockMeasures(w, null, null),
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

// The same element wired to a KPI and to a block must be counted over the same
// environment, or the card and the chart above it disagree by construction. The
// KPI used to pin production while the block read every environment.
describe("GlitchTipLogMonitorStrategy — the environment both measures send", () => {
  const MEASURES: ReadonlyArray<{
    name: string;
    run: (
      strategy: GlitchTipLogMonitorStrategy,
      environment: string | null,
    ) => Promise<unknown>;
  }> = [
    { name: "getKpiMeasures", run: (s, e) => s.getKpiMeasures(15, e) },
    { name: "getBlockMeasures", run: (s, e) => s.getBlockMeasures(15, e, null) },
  ];

  for (const measure of MEASURES) {
    it(`${measure.name} forwards the environment it is given`, async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));

      await measure.run(strategy, "staging");

      expect(getPaginated.mock.calls[0][1].environment).toBe("staging");
    });

    // `null` means "every environment" everywhere else in the dashboard — see
    // the isomorphic resolver in features/dashboard/state/environments.ts.
    it(`${measure.name} sends no environment filter when given none`, async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));

      await measure.run(strategy, null);

      expect(getPaginated.mock.calls[0][1].environment).toBeUndefined();
    });
  }
});

describe("GlitchTipLogMonitorStrategy.getBlockMeasures", () => {
  it("returns one series shape whichever chart will draw it", async () => {
    const { strategy } = buildStrategy(logWiring(ONE_TAG));

    const measure = await strategy.getBlockMeasures(30, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.windowMinutes).toBe(30);
    expect(measure.series).toHaveLength(1);
    expect(measure.series[0].key).toBe("t1");
  });

  it("buckets the log timestamps the provider returns", async () => {
    const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));
    const now = new Date().toISOString();
    getPaginated.mockResolvedValue([
      { id: "l1", body: "m", level: "info", timestamp: now },
      { id: "l2", body: "m", level: "info", timestamp: now },
    ]);

    const measure = await strategy.getBlockMeasures(30, null, null);

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

    const measure = await strategy.getBlockMeasures(30, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.series[0].points).toHaveLength(30);
    expect(measure.series[0].points.every((point) => point.count === 0)).toBe(
      true,
    );
  });

  it("keeps the buckets coarse on a wide window", async () => {
    const { strategy } = buildStrategy(logWiring(ONE_TAG));

    const measure = await strategy.getBlockMeasures(24 * 60, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.interval).toBe("1h");
  });

  it("names the series after the only tag the element declares", async () => {
    const { strategy } = buildStrategy(logWiring(ONE_TAG));

    const measure = await strategy.getBlockMeasures(30, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.series[0].label).toBe("reservation");
  });

  describe("a block declaring several log tags", () => {
    it("queries only the selected tag, since the provider ANDs the terms of one query", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));

      await strategy.getBlockMeasures(30, "production", null, { tagId: "t2" });

      expect(getPaginated).toHaveBeenCalledTimes(1);
      const params = getPaginated.mock.calls[0][1];
      expect(params.service).toBe("reservation.cancelled");
      expect(params.environment).toBe("production");
    });

    // Joining the tags into one query would AND them and count their
    // intersection — which is nothing, since a log line carries one service.
    it("asks one query per tag rather than joining their terms", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));

      await strategy.getBlockMeasures(30, null, null);

      expect(getPaginated).toHaveBeenCalledTimes(2);
      expect(
        getPaginated.mock.calls.map((call) => call[1].service),
      ).toEqual(["reservation.sent", "reservation.cancelled"]);
    });

    it("returns one series per tag, named and coloured after it", async () => {
      const { strategy } = buildStrategy(
        logWiring([
          { ...TWO_TAGS[0], color: LEVELS.NOTICE },
          { ...TWO_TAGS[1], color: LEVELS.ALERT },
        ]),
      );

      const measure = await strategy.getBlockMeasures(30, null, null);

      if (measure.type !== "series") throw new Error("expected a series");
      expect(
        measure.series.map(({ key, label, color }) => ({ key, label, color })),
      ).toEqual([
        { key: "t1", label: "Envoyées", color: LEVELS.NOTICE },
        { key: "t2", label: "Annulées", color: LEVELS.ALERT },
      ]);
    });

    it("counts each tag into its own series rather than into a shared total", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));
      const now = new Date().toISOString();
      getPaginated.mockImplementation((_path: string, params: { service: string }) =>
        Promise.resolve(
          params.service === "reservation.sent"
            ? [{ id: "a", body: "m", level: "info", timestamp: now }]
            : [
                { id: "b", body: "m", level: "info", timestamp: now },
                { id: "c", body: "m", level: "info", timestamp: now },
              ],
        ),
      );

      const measure = await strategy.getBlockMeasures(30, null, null);

      if (measure.type !== "series") throw new Error("expected a series");
      expect(
        measure.series.map((series) =>
          series.points.reduce((sum, point) => sum + (point.count ?? 0), 0),
        ),
      ).toEqual([1, 2]);
    });

    // A stack draws one row per bucket: series that disagreed on their epochs
    // would leave holes in every segment but the first.
    it("aligns every series on the same buckets", async () => {
      const { strategy } = buildStrategy(logWiring(TWO_TAGS));

      const measure = await strategy.getBlockMeasures(30, null, null);

      if (measure.type !== "series") throw new Error("expected a series");
      expect(measure.series[1].points.map((point) => point.bucketEpoch)).toEqual(
        measure.series[0].points.map((point) => point.bucketEpoch),
      );
    });

    it("merges every tag into one list when the block has no window", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));
      getPaginated.mockImplementation((_path: string, params: { service: string }) =>
        Promise.resolve(
          params.service === "reservation.sent"
            ? [{ id: "old", body: "m", level: "info", timestamp: "2026-05-28T08:00:00Z" }]
            : [{ id: "new", body: "m", level: "info", timestamp: "2026-05-28T09:00:00Z" }],
        ),
      );

      const measure = await strategy.getBlockMeasures(null, null, null);

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.entries.map((entry) => entry.id)).toEqual(["new", "old"]);
    });

    // The id comes from the browser: it is matched against the tags the element
    // declares rather than trusted, so nothing the client sends ever reaches
    // the provider query verbatim.
    it("refuses a tag the element does not declare rather than passing it to the provider", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(TWO_TAGS));

      await expect(
        strategy.getBlockMeasures(30, null, null, {
          tagId: "reservation.sent OR anything",
        }),
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

      const measure = await strategy.getBlockMeasures(null, null, 5);

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.entries).toHaveLength(1);
      expect(measure.windowMinutes).toBeNull();
    });

    // A log line has no detail sheet to open; an issue does.
    it("marks the list as having no detail sheet", async () => {
      const { strategy } = buildStrategy(logWiring(ONE_TAG));

      const measure = await strategy.getBlockMeasures(null, null, null);

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.hasDetail).toBe(false);
    });

    it("keeps the most recent rows, not the first the provider listed", async () => {
      const { strategy, getPaginated } = buildStrategy(logWiring(ONE_TAG));
      getPaginated.mockResolvedValue([
        { id: "old", body: "m", level: "info", timestamp: "2026-05-28T08:00:00Z" },
        { id: "new", body: "m", level: "info", timestamp: "2026-05-28T09:00:00Z" },
      ]);

      const measure = await strategy.getBlockMeasures(null, null, 1);

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.entries.map((entry) => entry.id)).toEqual(["new"]);
    });
  });
});
