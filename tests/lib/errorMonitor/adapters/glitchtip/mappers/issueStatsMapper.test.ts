import { describe, it, expect } from "vitest";
import { mapGlitchTipIssueStats } from "@/lib/errorMonitor/adapters/glitchtip/mappers/issueStatsMapper";
import type { GlitchTipIssueStatsDto } from "@/lib/errorMonitor/adapters/glitchtip/dto/GlitchTipIssueStats";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// 2026-07-03T08:00:00Z / 09:00:00Z / 10:00:00Z
const H08 = 1783065600;
const H09 = 1783069200;
const H10 = 1783072800;

const window3h = {
  fromMs: H08 * 1000,
  toMs: H10 * 1000,
  bucketMs: HOUR_MS,
};

function buildStatsDto(
  id: string,
  buckets: Array<[number, number]>,
): GlitchTipIssueStatsDto {
  return { id, count: String(buckets.length), stats: { "24h": buckets, "14d": null } };
}

describe("mapGlitchTipIssueStats", () => {
  it("sums the buckets of every issue on the matching hour", () => {
    const dtos = [
      buildStatsDto("1", [[H08, 2], [H09, 1]]),
      buildStatsDto("2", [[H09, 4]]),
    ];

    expect(mapGlitchTipIssueStats(dtos, "24h", window3h)).toEqual([
      { timestamp: "2026-07-03T08:00:00.000Z", count: 2 },
      { timestamp: "2026-07-03T09:00:00.000Z", count: 5 },
      { timestamp: "2026-07-03T10:00:00.000Z", count: 0 },
    ]);
  });

  it("zero-fills the whole window when no issue has stats", () => {
    expect(mapGlitchTipIssueStats([], "24h", window3h)).toEqual([
      { timestamp: "2026-07-03T08:00:00.000Z", count: 0 },
      { timestamp: "2026-07-03T09:00:00.000Z", count: 0 },
      { timestamp: "2026-07-03T10:00:00.000Z", count: 0 },
    ]);
  });

  it("drops buckets falling outside the requested window", () => {
    const dtos = [buildStatsDto("1", [[H08 - HOUR_MS / 1000, 9], [H09, 1]])];

    expect(mapGlitchTipIssueStats(dtos, "24h", window3h)).toEqual([
      { timestamp: "2026-07-03T08:00:00.000Z", count: 0 },
      { timestamp: "2026-07-03T09:00:00.000Z", count: 1 },
      { timestamp: "2026-07-03T10:00:00.000Z", count: 0 },
    ]);
  });

  it("reads the series matching the requested stats period", () => {
    const dtos: GlitchTipIssueStatsDto[] = [
      { id: "1", count: "1", stats: { "24h": [[H09, 7]], "14d": [[H08, 3]] } },
    ];

    expect(mapGlitchTipIssueStats(dtos, "14d", {
      fromMs: H08 * 1000,
      toMs: H08 * 1000 + DAY_MS,
      bucketMs: DAY_MS,
    })).toEqual([
      { timestamp: "2026-07-03T00:00:00.000Z", count: 3 },
      { timestamp: "2026-07-04T00:00:00.000Z", count: 0 },
    ]);
  });

  it("tolerates a null series for the requested period", () => {
    const dtos: GlitchTipIssueStatsDto[] = [
      { id: "1", count: "0", stats: { "24h": null, "14d": null } },
    ];

    expect(mapGlitchTipIssueStats(dtos, "24h", window3h).every((p) => p.count === 0)).toBe(true);
  });
});
