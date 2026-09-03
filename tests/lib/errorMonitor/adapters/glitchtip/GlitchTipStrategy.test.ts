import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlitchTipErrorMonitorStrategy } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorStrategy";
import type { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";
import type { GlitchTipIssueDto } from "@/lib/errorMonitor/adapters/glitchtip/dto/GlitchTipIssue";
import type { GlitchTipListEventDto } from "@/lib/errorMonitor/adapters/glitchtip/dto/GlitchTipEvent";

function buildIssueDto(overrides: Partial<GlitchTipIssueDto> = {}): GlitchTipIssueDto {
  return {
    id: "i1",
    title: "boom",
    level: "error",
    status: "unresolved",
    firstSeen: "2026-01-01T00:00:00Z",
    lastSeen: "2026-01-02T00:00:00Z",
    count: "1",
    project: { id: "p1", slug: "", name: "", platform: "" },
    metadata: { type: "Err", value: "" },
    ...overrides,
  };
}

function buildEventDto({
  id,
  environment,
}: {
  id: string;
  environment?: string;
}): GlitchTipListEventDto {
  return {
    id,
    event_id: id,
    date_created: "2026-05-28T00:00:00Z",
    tags: environment ? [{ key: "environment", value: environment }] : [],
  };
}

describe("GlitchTipErrorMonitorStrategy", () => {
  let get: ReturnType<typeof vi.fn>;
  let getPaginated: ReturnType<typeof vi.fn>;
  let post: ReturnType<typeof vi.fn>;
  let client: GlitchTipClient;
  let strategy: GlitchTipErrorMonitorStrategy;

  beforeEach(() => {
    get = vi.fn();
    getPaginated = vi.fn();
    post = vi.fn();
    client = { get, getPaginated, post } as unknown as GlitchTipClient;
    strategy = new GlitchTipErrorMonitorStrategy(client, "my-org");
  });

  describe("getIssues", () => {
    it("fetches all pages from the org issues endpoint and maps the response", async () => {
      getPaginated.mockResolvedValue([buildIssueDto({ id: "x" })]);

      const out = await strategy.getIssues("proj-1");

      expect(getPaginated).toHaveBeenCalledWith(
        "/api/0/organizations/my-org/issues/",
        expect.objectContaining({ project: "proj-1" }),
        expect.any(Object),
      );
      expect(out[0].id).toBe("x");
    });

    it("caps the result set at the requested limit", async () => {
      getPaginated.mockResolvedValue([]);

      await strategy.getIssues("proj", { resolved: false, limit: 10 });

      expect(getPaginated.mock.calls[0][1]).toMatchObject({
        project: "proj",
        query: "is:unresolved",
        limit: 10,
      });
      expect(getPaginated.mock.calls[0][2]).toEqual({ maxItems: 10 });
    });

    it("builds a resolved query when filters.resolved === true", async () => {
      getPaginated.mockResolvedValue([]);

      await strategy.getIssues("p", { resolved: true });

      expect(getPaginated.mock.calls[0][1]).toMatchObject({ query: "is:resolved" });
    });

    it("combines resolved + level filters", async () => {
      getPaginated.mockResolvedValue([]);

      await strategy.getIssues("p", { resolved: false, level: "fatal" });

      expect(getPaginated.mock.calls[0][1]).toMatchObject({ query: "is:unresolved level:fatal" });
    });

    it("sends an empty query when filters yield no parts, to include resolved issues", async () => {
      getPaginated.mockResolvedValue([]);

      await strategy.getIssues("p", {});

      expect(getPaginated.mock.calls[0][1]).toMatchObject({ project: "p", query: "" });
    });

    it("sends an empty query when filters is undefined, to include resolved issues", async () => {
      getPaginated.mockResolvedValue([]);

      await strategy.getIssues("p");

      expect(getPaginated.mock.calls[0][1]).toMatchObject({ project: "p", query: "" });
    });

    it("forwards the environment as a dedicated query param", async () => {
      getPaginated.mockResolvedValue([]);

      await strategy.getIssues("p", { resolved: false, environment: "production" });

      expect(getPaginated.mock.calls[0][1]).toMatchObject({ environment: "production" });
    });
  });

  describe("getErrorStats", () => {
    const WINDOW = {
      from: "2026-07-03T08:00:00Z",
      to: "2026-07-03T10:00:00Z",
      interval: "1h",
    } as const;

    // One mock backs both the issues list and every per-issue event feed.
    function routeFeeds(
      issues: GlitchTipIssueDto[],
      feeds: Record<string, GlitchTipListEventDto[]>,
    ) {
      getPaginated.mockImplementation(async (path: string) => {
        if (path.endsWith("/issues/")) return issues;
        const id = /\/issues\/([^/]+)\/events\//.exec(path)?.[1] ?? "";
        return feeds[id] ?? [];
      });
    }

    function buildEventAt(at: string, environment?: string): GlitchTipListEventDto {
      return {
        id: at,
        event_id: at,
        date_created: at,
        tags: environment ? [{ key: "environment", value: environment }] : [],
      };
    }

    const countAt = (series: { points: { timestamp: string; count: number }[] }, iso: string) =>
      series.points.find((point) => point.timestamp === iso)?.count;

    it("lists the project's issues without an environment filter", async () => {
      routeFeeds([], {});

      await strategy.getErrorStats("p", WINDOW, "production");

      expect(getPaginated.mock.calls[0][0]).toBe("/api/0/organizations/my-org/issues/");
      expect(getPaginated.mock.calls[0][1]).toMatchObject({ project: "p", query: "" });
      // Filtering the list would admit an issue whose window activity belongs
      // to another environment, and then count all of it.
      expect(getPaginated.mock.calls[0][1]).not.toHaveProperty("environment");
    });

    it("counts each event in the bucket of its own timestamp, zero-filling the window", async () => {
      routeFeeds([buildIssueDto({ id: "1", lastSeen: "2026-07-03T09:30:00Z" })], {
        "1": [
          buildEventAt("2026-07-03T09:30:00Z", "production"),
          buildEventAt("2026-07-03T09:15:00Z", "production"),
        ],
      });

      const out = await strategy.getErrorStats("p", WINDOW);

      expect(countAt(out, "2026-07-03T09:00:00.000Z")).toBe(2);
      expect(countAt(out, "2026-07-03T08:00:00.000Z")).toBe(0);
      expect(out.truncated).toBe(false);
    });

    it("keeps only the events whose own environment tag matches", async () => {
      routeFeeds([buildIssueDto({ id: "1", lastSeen: "2026-07-03T09:30:00Z" })], {
        "1": [
          buildEventAt("2026-07-03T09:30:00Z", "recette"),
          buildEventAt("2026-07-03T09:15:00Z", "production"),
        ],
      });

      const production = await strategy.getErrorStats("p", WINDOW, "production");
      const recette = await strategy.getErrorStats("p", WINDOW, "recette");
      const all = await strategy.getErrorStats("p", WINDOW);

      expect(countAt(production, "2026-07-03T09:00:00.000Z")).toBe(1);
      expect(countAt(recette, "2026-07-03T09:00:00.000Z")).toBe(1);
      // The whole point: a total is the sum of its environments.
      expect(countAt(all, "2026-07-03T09:00:00.000Z")).toBe(2);
    });

    it("ignores events that fall outside the window", async () => {
      routeFeeds([buildIssueDto({ id: "1", lastSeen: "2026-07-03T09:30:00Z" })], {
        "1": [
          buildEventAt("2026-07-03T09:30:00Z"),
          buildEventAt("2026-07-03T06:00:00Z"),
        ],
      });

      const out = await strategy.getErrorStats("p", WINDOW);

      expect(out.points.reduce((sum, point) => sum + point.count, 0)).toBe(1);
    });

    it("never reads the feed of an issue untouched during the window", async () => {
      routeFeeds(
        [
          buildIssueDto({ id: "stale", lastSeen: "2026-07-01T00:00:00Z" }),
          buildIssueDto({ id: "active", lastSeen: "2026-07-03T09:00:00Z" }),
        ],
        { active: [buildEventAt("2026-07-03T09:00:00Z")] },
      );

      await strategy.getErrorStats("p", WINDOW);

      const paths = getPaginated.mock.calls.map((call) => call[0]);
      expect(paths).toContain("/api/0/issues/active/events/");
      expect(paths).not.toContain("/api/0/issues/stale/events/");
    });

    it("stops walking a feed at the first event older than the window", async () => {
      routeFeeds([buildIssueDto({ id: "1", lastSeen: "2026-07-03T09:00:00Z" })], {
        "1": [buildEventAt("2026-07-03T09:00:00Z")],
      });

      await strategy.getErrorStats("p", WINDOW);

      const feedCall = getPaginated.mock.calls.find((call) =>
        String(call[0]).endsWith("/events/"),
      );
      const stopWhen = feedCall?.[2]?.stopWhen as (e: GlitchTipListEventDto) => boolean;
      expect(stopWhen(buildEventAt("2026-07-03T07:00:00Z"))).toBe(true);
      expect(stopWhen(buildEventAt("2026-07-03T09:00:00Z"))).toBe(false);
    });

    it("uses daily buckets when the period spans more than 24h", async () => {
      routeFeeds([buildIssueDto({ id: "1", lastSeen: "2026-07-04T00:00:00Z" })], {
        "1": [buildEventAt("2026-07-04T05:00:00Z")],
      });

      const out = await strategy.getErrorStats("p", {
        from: "2026-07-01T00:00:00Z",
        to: "2026-07-05T00:00:00Z",
        interval: "1d",
      });

      expect(out.points).toHaveLength(5);
      expect(countAt(out, "2026-07-04T00:00:00.000Z")).toBe(1);
    });

    it("flags the series as truncated when the event budget runs out", async () => {
      const flood = Array.from({ length: 2_000 }, () =>
        buildEventAt("2026-07-03T09:00:00Z"),
      );
      routeFeeds([buildIssueDto({ id: "1", lastSeen: "2026-07-03T09:00:00Z" })], {
        "1": flood,
      });

      const out = await strategy.getErrorStats("p", WINDOW);

      expect(out.truncated).toBe(true);
      expect(countAt(out, "2026-07-03T09:00:00.000Z")).toBe(2_000);
    });

    it("flags the series as truncated when the issues list caps on still-active issues", async () => {
      const capped = Array.from({ length: 200 }, (_unused, i) =>
        buildIssueDto({ id: `i${i}`, lastSeen: "2026-07-03T09:00:00Z" }),
      );
      routeFeeds(capped, {});

      const out = await strategy.getErrorStats("p", WINDOW);

      expect(out.truncated).toBe(true);
    });

    it("reports a complete all-zero series when nothing happened in the window", async () => {
      routeFeeds([buildIssueDto({ id: "1", lastSeen: "2026-07-01T00:00:00Z" })], {});

      const out = await strategy.getErrorStats("p", WINDOW);

      expect(out.points.map((point) => point.count)).toEqual([0, 0, 0]);
      expect(out.truncated).toBe(false);
    });
  });

  describe("getIssue", () => {
    it("hits the single-issue endpoint and maps", async () => {
      get.mockResolvedValue(buildIssueDto({ id: "42" }));

      const out = await strategy.getIssue("42");

      expect(get).toHaveBeenCalledWith("/api/0/issues/42/");
      expect(out.id).toBe("42");
    });
  });

  describe("getIssueLatestEvent", () => {
    it("returns the mapped event on success", async () => {
      get.mockResolvedValue({
        id: "e1",
        eventID: "abc",
        dateCreated: "2026-05-28T00:00:00Z",
      });

      const out = await strategy.getIssueLatestEvent("i1");

      expect(get).toHaveBeenCalledWith("/api/0/issues/i1/events/latest/");
      expect(out?.id).toBe("e1");
    });

    it("takes the head of the scoped feed instead, since /events/latest/ ignores the environment", async () => {
      getPaginated.mockResolvedValue([
        buildEventDto({ id: "e-recette", environment: "recette" }),
        buildEventDto({ id: "e-prod", environment: "production" }),
      ]);

      const out = await strategy.getIssueLatestEvent("i1", "production");

      expect(get).not.toHaveBeenCalled();
      expect(out?.id).toBe("e-prod");
    });

    it("returns null when no event of that environment is in the scanned feed", async () => {
      getPaginated.mockResolvedValue([
        buildEventDto({ id: "e-recette", environment: "recette" }),
      ]);

      await expect(strategy.getIssueLatestEvent("i1", "production")).resolves.toBeNull();
    });

    it("returns null when the underlying call surfaces a 404", async () => {
      get.mockRejectedValue(new Error("GlitchTip API error 404 on /events/latest/: not found"));

      const out = await strategy.getIssueLatestEvent("missing");

      expect(out).toBeNull();
    });

    it("rethrows non-404 errors", async () => {
      get.mockRejectedValue(new Error("GlitchTip API error 500"));

      await expect(strategy.getIssueLatestEvent("x")).rejects.toThrow("500");
    });
  });

  describe("getIssueEvents", () => {
    it("forwards the default limit of 25", async () => {
      get.mockResolvedValue([]);

      await strategy.getIssueEvents("i1");

      expect(get).toHaveBeenCalledWith(
        "/api/0/issues/i1/events/",
        expect.objectContaining({ limit: 25 }),
      );
    });

    it("forwards a custom limit and maps the events", async () => {
      get.mockResolvedValue([
        { id: "e1", event_id: "x", date_created: "2026-05-28T00:00:00Z" },
      ]);

      const out = await strategy.getIssueEvents("i1", 5);

      expect(get.mock.calls[0][1]).toMatchObject({ limit: 5 });
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe("e1");
    });

    it("keeps only the events tagged with the requested environment", async () => {
      getPaginated.mockResolvedValue([
        buildEventDto({ id: "e1", environment: "production" }),
        buildEventDto({ id: "e2", environment: "recette" }),
        buildEventDto({ id: "e3", environment: "production" }),
        buildEventDto({ id: "e4" }),
      ]);

      const out = await strategy.getIssueEvents("i1", 25, "production");

      expect(get).not.toHaveBeenCalled();
      expect(getPaginated).toHaveBeenCalledWith(
        "/api/0/issues/i1/events/",
        {},
        { maxItems: 100 },
      );
      expect(out.map((event) => event.id)).toEqual(["e1", "e3"]);
    });

    it("caps the filtered feed at the requested limit", async () => {
      getPaginated.mockResolvedValue([
        buildEventDto({ id: "e1", environment: "production" }),
        buildEventDto({ id: "e2", environment: "production" }),
        buildEventDto({ id: "e3", environment: "production" }),
      ]);

      const out = await strategy.getIssueEvents("i1", 2, "production");

      expect(out.map((event) => event.id)).toEqual(["e1", "e2"]);
    });
  });

  describe("getIssueComments", () => {
    it("fetches all pages from the comments endpoint and maps the response", async () => {
      getPaginated.mockResolvedValue([
        { id: "c1", dateCreated: "2026-05-28T00:00:00Z", data: { text: "hi" } },
      ]);

      const out = await strategy.getIssueComments("i1");

      expect(getPaginated).toHaveBeenCalledWith("/api/0/issues/i1/comments/");
      expect(out[0]).toMatchObject({ id: "c1", text: "hi" });
    });
  });

  describe("createIssueComment", () => {
    it("posts the text in GlitchTip's data envelope and maps the created comment", async () => {
      post.mockResolvedValue({
        id: "c9",
        dateCreated: "2026-05-28T00:00:00Z",
        data: { text: "on it" },
        user: { name: "Ada", email: "ada@example.com" },
      });

      const out = await strategy.createIssueComment("i1", { text: "on it" });

      expect(post).toHaveBeenCalledWith("/api/0/issues/i1/comments/", {
        data: { text: "on it" },
      });
      expect(out).toEqual({
        id: "c9",
        dateCreated: "2026-05-28T00:00:00Z",
        text: "on it",
        authorName: "Ada",
        authorEmail: "ada@example.com",
      });
    });

    it("lets a client failure bubble up", async () => {
      post.mockRejectedValue(new Error("GlitchTip API error 403 on /api/0/issues/i1/comments/"));

      await expect(strategy.createIssueComment("i1", { text: "x" })).rejects.toThrow(/403/);
    });
  });
});
