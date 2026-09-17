import { describe, it, expect, vi } from "vitest";
import { PostHogStrategy } from "@/lib/trackerMonitor/adapters/posthog/PostHogStrategy";
import type { PostHogClient } from "@/lib/tool/posthog/PostHogClient";
import type { PostHogQueryResponseDto } from "@/lib/trackerMonitor/adapters/posthog/dto/PostHogQueryResponse";

function makeClient(response: PostHogQueryResponseDto = { results: [] }) {
  const query = vi.fn().mockResolvedValue(response);
  return { client: { query } as unknown as PostHogClient, query };
}

const CONNECTION = { baseUrl: "https://ph", projectId: "1" };

describe("PostHogStrategy.getActiveUsersTimeline", () => {
  it("calls the client with a HogQL query built from the requested window", async () => {
    const { client, query } = makeClient();
    const strategy = new PostHogStrategy(client, CONNECTION);

    await strategy.getActiveUsersTimeline("p1", 15);

    expect(query).toHaveBeenCalledTimes(1);
    const hogQl: string = query.mock.calls[0][0];
    expect(hogQl).toContain("subtractMinutes(now(), 15)");
    expect(hogQl).toContain("GROUP BY minute");
    expect(hogQl).toContain("ORDER BY minute ASC");
  });

  it("uses the fallback window (30) when given a non-integer", async () => {
    const { client, query } = makeClient();
    const strategy = new PostHogStrategy(client, CONNECTION);

    await strategy.getActiveUsersTimeline("p1", 3.5);

    expect(query.mock.calls[0][0]).toContain("subtractMinutes(now(), 30)");
  });

  it("uses the fallback window (30) when given a zero or negative window", async () => {
    const { client, query } = makeClient();
    const strategy = new PostHogStrategy(client, CONNECTION);

    await strategy.getActiveUsersTimeline("p1", 0);
    expect(query.mock.calls[0][0]).toContain("subtractMinutes(now(), 30)");

    await strategy.getActiveUsersTimeline("p1", -5);
    expect(query.mock.calls[1][0]).toContain("subtractMinutes(now(), 30)");
  });

  it("uses SESSION_DURATION_MINUTES (30) to classify new vs returning visitors", async () => {
    const { client, query } = makeClient();
    const strategy = new PostHogStrategy(client, CONNECTION);

    await strategy.getActiveUsersTimeline("p1", 60);

    const hogQl: string = query.mock.calls[0][0];
    expect(hogQl).toContain("fs.first_ts >= subtractMinutes(e.timestamp, 30)");
    expect(hogQl).toContain("fs.first_ts < subtractMinutes(e.timestamp, 30)");
  });

  it("returns a series of length equal to the requested window", async () => {
    const { client } = makeClient({ results: [] });
    const strategy = new PostHogStrategy(client, CONNECTION);

    const out = await strategy.getActiveUsersTimeline("p1", 7);

    expect(out).toHaveLength(7);
  });

  it("propagates client errors", async () => {
    const query = vi.fn().mockRejectedValue(new Error("boom"));
    const strategy = new PostHogStrategy({ query } as unknown as PostHogClient, CONNECTION);

    await expect(strategy.getActiveUsersTimeline("p1", 5)).rejects.toThrow("boom");
  });
});

describe("PostHogStrategy.getTotalVisitors", () => {
  it("counts unique visitors with no time bound", async () => {
    const { client, query } = makeClient({ results: [[1234]] });
    const strategy = new PostHogStrategy(client, CONNECTION);

    const total = await strategy.getTotalVisitors();

    expect(total).toBe(1234);
    const hogQl: string = query.mock.calls[0][0];
    expect(hogQl).toContain("uniqExact(distinct_id)");
    expect(hogQl).not.toContain("subtractMinutes");
  });

  it("reads a string count as a number", async () => {
    const { client } = makeClient({ results: [["42"]] });

    await expect(new PostHogStrategy(client, CONNECTION).getTotalVisitors()).resolves.toBe(42);
  });

  it("returns zero when the project has no event yet", async () => {
    const { client } = makeClient({ results: [] });

    await expect(new PostHogStrategy(client, CONNECTION).getTotalVisitors()).resolves.toBe(0);
  });

  it("propagates client errors", async () => {
    const query = vi.fn().mockRejectedValue(new Error("boom"));
    const strategy = new PostHogStrategy({ query } as unknown as PostHogClient, CONNECTION);

    await expect(strategy.getTotalVisitors()).rejects.toThrow("boom");
  });
});

// The timeline is zero-filled per minute and matched on the minute, so a row
// has to name a minute inside the window to be counted.
function minuteEpochSeconds(minutesAgo = 0): number {
  const MINUTE_MS = 60_000;
  return (
    (Math.floor(Date.now() / MINUTE_MS) - minutesAgo) * MINUTE_MS / 1000
  );
}

describe("PostHogStrategy.getKpiMeasures", () => {
  it("sums new and returning visitors over the window", async () => {
    const { client } = makeClient({
      results: [
        [minuteEpochSeconds(0), 2, 3],
        [minuteEpochSeconds(1), 1, 0],
      ],
    });

    const measure = await new PostHogStrategy(client, CONNECTION).getKpiMeasures(
      60,
      null,
    );

    expect(measure).toEqual({ value: 6, windowMinutes: 60 });
  });

  it("reports zero rather than NaN when nobody visited", async () => {
    const { client } = makeClient({ results: [] });

    expect(
      await new PostHogStrategy(client, CONNECTION).getKpiMeasures(60, null),
    ).toEqual({ value: 0, windowMinutes: 60 });
  });

  describe("without a window", () => {
    it("reads the visitors total instead of the timeline", async () => {
      const { client, query } = makeClient({ results: [[1234]] });

      const measure = await new PostHogStrategy(
        client,
        CONNECTION,
      ).getKpiMeasures(null, null);

      expect(measure).toEqual({ value: 1234, windowMinutes: null });
      expect(query.mock.calls[0][0]).toContain("uniqExact(distinct_id)");
      expect(query.mock.calls[0][0]).not.toContain("subtractMinutes");
    });
  });
});

describe("PostHogStrategy.getBlockMeasures", () => {
  it("gives the timeline one series per visitor kind — what a stack needs", async () => {
    const { client } = makeClient({
      results: [[minuteEpochSeconds(0), 4, 7]],
    });

    const measure = await new PostHogStrategy(
      client,
      CONNECTION,
    ).getBlockMeasures(60, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.series.map((series) => series.key)).toEqual([
      "newCount",
      "returningCount",
    ]);
    const last = (index: number) => {
      const points = measure.series[index].points;
      return points[points.length - 1].count;
    };
    expect(last(0)).toBe(4);
    expect(last(1)).toBe(7);
  });

  it("reports the window and the minute granularity it serves", async () => {
    const { client } = makeClient();

    const measure = await new PostHogStrategy(
      client,
      CONNECTION,
    ).getBlockMeasures(60, null, null);

    if (measure.type !== "series") throw new Error("expected a series");
    expect(measure.windowMinutes).toBe(60);
    expect(measure.interval).toBe("1m");
  });

  it("refuses a list from a tracker monitor, which exposes no rows", async () => {
    const { client, query } = makeClient();

    await expect(
      new PostHogStrategy(client, CONNECTION).getBlockMeasures(null, null, 10),
    ).rejects.toThrow(/exposes no rows/);
    expect(query).not.toHaveBeenCalled();
  });
});
