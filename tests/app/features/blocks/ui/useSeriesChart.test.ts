// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSeriesChart } from "@/app/features/blocks/ui/blockType/useSeriesChart";
import { LEVELS, type Level } from "@/lib/config/domain/Level";
import type { SeriesBlockMeasure } from "@/lib/shared/domain/BlockMeasure";

function measure(...keys: string[]): SeriesBlockMeasure {
  return {
    type: "series",
    windowMinutes: 30,
    interval: "1m",
    series: keys.map((key) => ({
      key,
      label: key,
      points: [{ bucketEpoch: 1_757_000_000_000, label: "08:00", count: 3 }],
    })),
  };
}

function colorOf(config: ReturnType<typeof useSeriesChart>["config"], key: string) {
  return config[key]?.color;
}

describe("useSeriesChart", () => {
  it("colours the first series with the accent it is handed", () => {
    const { result } = renderHook(() => useSeriesChart(measure("count"), "warning"));

    expect(colorOf(result.current.config, "count")).toBe("var(--level-warning)");
  });

  it("recolours when the accent changes — a tag switch must repaint the marks", () => {
    const initialProps: { accent: Level } = { accent: LEVELS.INFO };
    const { result, rerender } = renderHook(
      ({ accent }: { accent: Level }) => useSeriesChart(measure("count"), accent),
      { initialProps },
    );

    expect(colorOf(result.current.config, "count")).toBe("var(--primary)");

    rerender({ accent: "critical" });

    expect(colorOf(result.current.config, "count")).toBe("var(--level-critical)");
  });

  it("leaves the secondary series on the shared palette, whatever the accent", () => {
    const { result } = renderHook(() =>
      useSeriesChart(measure("first", "second"), "emergency"),
    );

    expect(colorOf(result.current.config, "first")).toBe("var(--level-emergency)");
    expect(colorOf(result.current.config, "second")).toBe("var(--level-info)");
  });

  it("merges the series into one row per bucket, sorted by epoch", () => {
    const { result } = renderHook(() =>
      useSeriesChart(
        {
          type: "series",
          windowMinutes: 30,
          interval: "1m",
          series: [
            {
              key: "a",
              label: "A",
              points: [
                { bucketEpoch: 2_000, label: "08:01", count: 5 },
                { bucketEpoch: 1_000, label: "08:00", count: 1 },
              ],
            },
            {
              key: "b",
              label: "B",
              points: [{ bucketEpoch: 1_000, label: "08:00", count: 7 }],
            },
          ],
        },
        "info",
      ),
    );

    expect(result.current.rows).toEqual([
      { bucketEpoch: 1_000, label: "08:00", a: 1, b: 7 },
      { bucketEpoch: 2_000, label: "08:01", a: 5 },
    ]);
    expect(result.current.ticks).toEqual([1_000, 2_000]);
    expect(result.current.labelOf(2_000)).toBe("08:01");
    expect(result.current.labelOf(9_999)).toBe("");
  });
});
