import { describe, it, expect } from "vitest";
import { mapGlitchTipStatsV2 } from "@/lib/errorMonitor/adapters/glitchtip/mappers/statsV2Mapper";
import type { GlitchTipStatsV2Dto } from "@/lib/errorMonitor/adapters/glitchtip/dto/GlitchTipStatsV2";

describe("mapGlitchTipStatsV2", () => {
  it("zips intervals with the first group sum(quantity) series", () => {
    const dto: GlitchTipStatsV2Dto = {
      start: "2026-05-28T00:00:00Z",
      end: "2026-05-28T03:00:00Z",
      intervals: [
        "2026-05-28T00:00:00Z",
        "2026-05-28T01:00:00Z",
        "2026-05-28T02:00:00Z",
      ],
      groups: [
        {
          by: { category: "error" },
          totals: { "sum(quantity)": 15 },
          series: { "sum(quantity)": [3, 5, 7] },
        },
      ],
    };

    expect(mapGlitchTipStatsV2(dto)).toEqual([
      { timestamp: "2026-05-28T00:00:00Z", count: 3 },
      { timestamp: "2026-05-28T01:00:00Z", count: 5 },
      { timestamp: "2026-05-28T02:00:00Z", count: 7 },
    ]);
  });

  it("returns an empty array when intervals is missing", () => {
    const dto = { groups: [{ by: {}, totals: {}, series: {} }] } as unknown as GlitchTipStatsV2Dto;

    expect(mapGlitchTipStatsV2(dto)).toEqual([]);
  });

  it("defaults each bucket to 0 when the series for that index is missing", () => {
    const dto: GlitchTipStatsV2Dto = {
      start: "",
      end: "",
      intervals: ["a", "b", "c"],
      groups: [
        {
          by: {},
          totals: {},
          series: { "sum(quantity)": [10] },
        },
      ],
    };

    expect(mapGlitchTipStatsV2(dto)).toEqual([
      { timestamp: "a", count: 10 },
      { timestamp: "b", count: 0 },
      { timestamp: "c", count: 0 },
    ]);
  });

  it("returns zeroed buckets when groups is empty", () => {
    const dto: GlitchTipStatsV2Dto = {
      start: "",
      end: "",
      intervals: ["a", "b"],
      groups: [],
    };

    expect(mapGlitchTipStatsV2(dto)).toEqual([
      { timestamp: "a", count: 0 },
      { timestamp: "b", count: 0 },
    ]);
  });

  it("ignores additional groups beyond the first", () => {
    const dto: GlitchTipStatsV2Dto = {
      start: "",
      end: "",
      intervals: ["a"],
      groups: [
        { by: {}, totals: {}, series: { "sum(quantity)": [1] } },
        { by: {}, totals: {}, series: { "sum(quantity)": [999] } },
      ],
    };

    expect(mapGlitchTipStatsV2(dto)).toEqual([{ timestamp: "a", count: 1 }]);
  });
});
