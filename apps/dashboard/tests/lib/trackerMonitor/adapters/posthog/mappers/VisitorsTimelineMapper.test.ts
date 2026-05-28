import { describe, it, expect } from "vitest";
import { mapPostHogVisitorsTimeline } from "@/lib/trackerMonitor/adapters/posthog/mappers/VisitorsTimelineMapper";
import type { PostHogQueryResponseDto } from "@/lib/trackerMonitor/adapters/posthog/dto/PostHogQueryResponse";

const NOW = new Date("2026-05-28T08:30:45.123Z");

describe("mapPostHogVisitorsTimeline", () => {
  it("returns an empty zero-filled series of the requested length when results is empty", () => {
    const dto: PostHogQueryResponseDto = { results: [] };

    const out = mapPostHogVisitorsTimeline(dto, 5, NOW);

    expect(out).toHaveLength(5);
    expect(out.every((p) => p.newCount === 0 && p.returningCount === 0)).toBe(true);
  });

  it("aligns the last bucket on the current minute (UTC) and goes back windowMinutes-1 minutes", () => {
    const out = mapPostHogVisitorsTimeline({ results: [] }, 5, NOW);

    expect(out[4].minuteIso).toBe("2026-05-28T08:30:00.000Z");
    expect(out[0].minuteIso).toBe("2026-05-28T08:26:00.000Z");
  });

  it("merges PostHog rows with ISO-Z timestamps into the matching minute buckets", () => {
    const dto: PostHogQueryResponseDto = {
      results: [
        ["2026-05-28T08:28:00Z", 1, 2],
        ["2026-05-28T08:30:00Z", 3, 4],
      ],
    };

    const out = mapPostHogVisitorsTimeline(dto, 5, NOW);

    expect(out[2]).toMatchObject({ newCount: 1, returningCount: 2 });
    expect(out[4]).toMatchObject({ newCount: 3, returningCount: 4 });
    expect(out[0]).toMatchObject({ newCount: 0, returningCount: 0 });
  });

  it("ignores rows whose minute is outside the empty series window", () => {
    const dto: PostHogQueryResponseDto = {
      results: [
        ["2026-05-28T07:00:00Z", 99, 99],
        ["2026-05-28T08:30:00Z", 1, 1],
      ],
    };

    const out = mapPostHogVisitorsTimeline(dto, 5, NOW);

    expect(out[4]).toMatchObject({ newCount: 1, returningCount: 1 });
    expect(out.reduce((acc, p) => acc + p.newCount, 0)).toBe(1);
  });

  it("parses numeric epoch milliseconds (> 1e12)", () => {
    const ms = new Date("2026-05-28T08:29:00Z").getTime();
    const dto: PostHogQueryResponseDto = {
      results: [[ms, 5, 6]],
    };

    const out = mapPostHogVisitorsTimeline(dto, 5, NOW);

    expect(out[3]).toMatchObject({ newCount: 5, returningCount: 6 });
  });

  it("parses numeric epoch seconds (<= 1e12)", () => {
    const seconds = new Date("2026-05-28T08:29:00Z").getTime() / 1000;
    const dto: PostHogQueryResponseDto = {
      results: [[seconds, 7, 8]],
    };

    const out = mapPostHogVisitorsTimeline(dto, 5, NOW);

    expect(out[3]).toMatchObject({ newCount: 7, returningCount: 8 });
  });

  it("parses string numeric epoch seconds", () => {
    const seconds = String(new Date("2026-05-28T08:29:00Z").getTime() / 1000);
    const dto: PostHogQueryResponseDto = {
      results: [[seconds, 1, 1]],
    };

    const out = mapPostHogVisitorsTimeline(dto, 5, NOW);

    expect(out[3]).toMatchObject({ newCount: 1, returningCount: 1 });
  });

  it("skips rows with null minute or unparseable string", () => {
    const dto: PostHogQueryResponseDto = {
      results: [
        [null, 10, 10],
        ["not a date", 20, 20],
        ["2026-05-28T08:30:00Z", 1, 1],
      ],
    };

    const out = mapPostHogVisitorsTimeline(dto, 5, NOW);

    expect(out[4]).toMatchObject({ newCount: 1, returningCount: 1 });
    expect(out.slice(0, 4).every((p) => p.newCount === 0 && p.returningCount === 0)).toBe(true);
  });

  it("coerces non-finite or null counts to 0", () => {
    const dto: PostHogQueryResponseDto = {
      results: [
        ["2026-05-28T08:30:00Z", null, "bad"],
      ],
    };

    const out = mapPostHogVisitorsTimeline(dto, 5, NOW);

    expect(out[4]).toMatchObject({ newCount: 0, returningCount: 0 });
  });

  it("coerces numeric string counts to numbers", () => {
    const dto: PostHogQueryResponseDto = {
      results: [["2026-05-28T08:30:00Z", "12", "34"]],
    };

    const out = mapPostHogVisitorsTimeline(dto, 5, NOW);

    expect(out[4]).toMatchObject({ newCount: 12, returningCount: 34 });
  });

  it("defaults to current time when no `now` is provided", () => {
    const out = mapPostHogVisitorsTimeline({ results: [] }, 3);

    expect(out).toHaveLength(3);
    expect(out[2].minuteIso).toBeDefined();
  });

  it("treats results as an empty array when undefined", () => {
    const out = mapPostHogVisitorsTimeline({ results: undefined as unknown as [] }, 3, NOW);

    expect(out).toHaveLength(3);
    expect(out.every((p) => p.newCount === 0)).toBe(true);
  });

  it("populates a French HH:MM label per bucket", () => {
    const out = mapPostHogVisitorsTimeline({ results: [] }, 2, NOW);

    expect(out[1].label).toMatch(/^\d{2}:\d{2}$/);
  });
});
