import { describe, it, expect } from "vitest";
import { mapGlitchTipEventSeries } from "@/lib/errorMonitor/adapters/glitchtip/mappers/eventSeriesMapper";
import type { GlitchTipListEventDto } from "@/lib/errorMonitor/adapters/glitchtip/dto/GlitchTipEvent";

const HOUR_MS = 3_600_000;

function event(at: string, environment?: string): GlitchTipListEventDto {
  return {
    id: at,
    event_id: at,
    date_created: at,
    tags: environment ? [{ key: "environment", value: environment }] : [],
  };
}

const WINDOW = {
  fromMs: Date.parse("2026-07-03T08:00:00Z"),
  toMs: Date.parse("2026-07-03T10:00:00Z"),
  bucketMs: HOUR_MS,
};

describe("mapGlitchTipEventSeries", () => {
  it("zero-fills every bucket of the window", () => {
    const out = mapGlitchTipEventSeries([], WINDOW);

    expect(out).toEqual([
      { timestamp: "2026-07-03T08:00:00.000Z", count: 0 },
      { timestamp: "2026-07-03T09:00:00.000Z", count: 0 },
      { timestamp: "2026-07-03T10:00:00.000Z", count: 0 },
    ]);
  });

  it("counts one per event, in the bucket of its own timestamp", () => {
    const out = mapGlitchTipEventSeries(
      [
        event("2026-07-03T08:05:00Z"),
        event("2026-07-03T08:59:59Z"),
        event("2026-07-03T09:00:00Z"),
      ],
      WINDOW,
    );

    expect(out.map((p) => p.count)).toEqual([2, 1, 0]);
  });

  it("keeps only the events tagged with the requested environment", () => {
    const events = [
      event("2026-07-03T09:10:00Z", "production"),
      event("2026-07-03T09:20:00Z", "recette"),
      event("2026-07-03T09:30:00Z", "production"),
    ];

    const production = mapGlitchTipEventSeries(events, WINDOW, "production");
    const all = mapGlitchTipEventSeries(events, WINDOW);

    expect(production.map((p) => p.count)).toEqual([0, 2, 0]);
    // A total is the sum of its environments — that is what the per-issue
    // scoping used to break.
    expect(all.map((p) => p.count)).toEqual([0, 3, 0]);
  });

  it("drops an event with no environment tag when one is requested", () => {
    const out = mapGlitchTipEventSeries(
      [event("2026-07-03T09:10:00Z")],
      WINDOW,
      "production",
    );

    expect(out.map((p) => p.count)).toEqual([0, 0, 0]);
  });

  it("ignores events outside the window and unparseable timestamps", () => {
    const out = mapGlitchTipEventSeries(
      [
        event("2026-07-03T07:59:59Z"),
        event("2026-07-03T10:00:01Z"),
        event("not-a-date"),
        event("2026-07-03T09:00:00Z"),
      ],
      WINDOW,
    );

    expect(out.map((p) => p.count)).toEqual([0, 1, 0]);
  });

  it("buckets by day when the window asks for daily granularity", () => {
    const out = mapGlitchTipEventSeries(
      [event("2026-07-02T23:00:00Z"), event("2026-07-03T01:00:00Z")],
      {
        fromMs: Date.parse("2026-07-01T00:00:00Z"),
        toMs: Date.parse("2026-07-03T00:00:00Z"),
        bucketMs: 24 * HOUR_MS,
      },
    );

    expect(out).toEqual([
      { timestamp: "2026-07-01T00:00:00.000Z", count: 0 },
      { timestamp: "2026-07-02T00:00:00.000Z", count: 1 },
      { timestamp: "2026-07-03T00:00:00.000Z", count: 0 },
    ]);
  });
});
