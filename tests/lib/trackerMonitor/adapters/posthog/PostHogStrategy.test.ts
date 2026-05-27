import { describe, it, expect, vi } from "vitest";
import { PostHogStrategy } from "@/lib/trackerMonitor/adapters/posthog/PostHogStrategy";
import type { PostHogClient } from "@/lib/posthog/PostHogClient";
import type { PostHogQueryResponseDto } from "@/lib/trackerMonitor/adapters/posthog/dto/PostHogQueryResponse";

function makeClient(response: PostHogQueryResponseDto = { results: [] }) {
  const query = vi.fn().mockResolvedValue(response);
  return { client: { query } as unknown as PostHogClient, query };
}

describe("PostHogStrategy.getActiveUsersTimeline", () => {
  it("calls the client with a HogQL query built from the requested window", async () => {
    const { client, query } = makeClient();
    const strategy = new PostHogStrategy(client);

    await strategy.getActiveUsersTimeline("p1", 15);

    expect(query).toHaveBeenCalledTimes(1);
    const hogQl: string = query.mock.calls[0][0];
    expect(hogQl).toContain("subtractMinutes(now(), 15)");
    expect(hogQl).toContain("GROUP BY minute");
    expect(hogQl).toContain("ORDER BY minute ASC");
  });

  it("uses the fallback window (30) when given a non-integer", async () => {
    const { client, query } = makeClient();
    const strategy = new PostHogStrategy(client);

    await strategy.getActiveUsersTimeline("p1", 3.5);

    expect(query.mock.calls[0][0]).toContain("subtractMinutes(now(), 30)");
  });

  it("uses the fallback window (30) when given a zero or negative window", async () => {
    const { client, query } = makeClient();
    const strategy = new PostHogStrategy(client);

    await strategy.getActiveUsersTimeline("p1", 0);
    expect(query.mock.calls[0][0]).toContain("subtractMinutes(now(), 30)");

    await strategy.getActiveUsersTimeline("p1", -5);
    expect(query.mock.calls[1][0]).toContain("subtractMinutes(now(), 30)");
  });

  it("uses SESSION_DURATION_MINUTES (30) to classify new vs returning visitors", async () => {
    const { client, query } = makeClient();
    const strategy = new PostHogStrategy(client);

    await strategy.getActiveUsersTimeline("p1", 60);

    const hogQl: string = query.mock.calls[0][0];
    expect(hogQl).toContain("fs.first_ts >= subtractMinutes(e.timestamp, 30)");
    expect(hogQl).toContain("fs.first_ts < subtractMinutes(e.timestamp, 30)");
  });

  it("returns a series of length equal to the requested window", async () => {
    const { client } = makeClient({ results: [] });
    const strategy = new PostHogStrategy(client);

    const out = await strategy.getActiveUsersTimeline("p1", 7);

    expect(out).toHaveLength(7);
  });

  it("propagates client errors", async () => {
    const query = vi.fn().mockRejectedValue(new Error("boom"));
    const strategy = new PostHogStrategy({ query } as unknown as PostHogClient);

    await expect(strategy.getActiveUsersTimeline("p1", 5)).rejects.toThrow("boom");
  });
});
