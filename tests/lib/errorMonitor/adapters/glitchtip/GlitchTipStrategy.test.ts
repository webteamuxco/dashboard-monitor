import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlitchTipErrorMonitorStrategy } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipErrorMonitorStrategy";
import type { GlitchTipClient } from "@/lib/tool/glitchtip/GlitchTipClient";
import type { GlitchTipIssueDto } from "@/lib/errorMonitor/adapters/glitchtip/dto/GlitchTipIssue";

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

const CONNECTION = { baseUrl: "https://gt", organizationSlug: "org", projectId: "p" };

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
    strategy = new GlitchTipErrorMonitorStrategy(client, CONNECTION);
  });

  describe("getIssues", () => {
    it("fetches all pages from the org issues endpoint and maps the response", async () => {
      getPaginated.mockResolvedValue([buildIssueDto({ id: "x" })]);

      const out = await strategy.getIssues("proj-1");

      expect(getPaginated).toHaveBeenCalledWith(
        "/api/0/organizations/org/issues/",
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
    it("calls stats_v2 with the period parameters and maps the response", async () => {
      get.mockResolvedValue({
        intervals: ["2026-05-28T00:00:00Z"],
        groups: [{ by: {}, totals: {}, series: { "sum(quantity)": [3] } }],
      });

      const out = await strategy.getErrorStats("p", {
        from: "2026-05-28T00:00:00Z",
        to: "2026-05-29T00:00:00Z",
        interval: "1h",
      });

      expect(get).toHaveBeenCalledWith(
        "/api/0/organizations/org/stats_v2/",
        expect.objectContaining({
          category: "error",
          interval: "1h",
          field: "sum(quantity)",
          project: "p",
          start: "2026-05-28T00:00:00Z",
          end: "2026-05-29T00:00:00Z",
        }),
      );
      expect(out).toEqual({
        interval: "1h",
        points: [{ timestamp: "2026-05-28T00:00:00Z", count: 3 }],
      });
    });

    it("does not send the environment to stats_v2 (it is ignored there)", async () => {
      get.mockResolvedValue({ intervals: [], groups: [] });

      await strategy.getErrorStats("p", {
        from: "2026-05-28T00:00:00Z",
        to: "2026-05-29T00:00:00Z",
        interval: "1h",
      });

      expect(get.mock.calls[0][1]).not.toHaveProperty("environment");
    });

    it("sums the issues-stats buckets of the issues seen in the environment", async () => {
      getPaginated.mockResolvedValue([
        buildIssueDto({ id: "1" }),
        buildIssueDto({ id: "2" }),
      ]);
      get.mockResolvedValue([
        { id: "1", count: "3", stats: { "24h": [[1783069200, 2]], "14d": null } },
        { id: "2", count: "1", stats: { "24h": [[1783069200, 1]], "14d": null } },
      ]);

      const out = await strategy.getErrorStats(
        "p",
        { from: "2026-07-03T08:00:00Z", to: "2026-07-03T10:00:00Z", interval: "1h" },
        "production",
      );

      expect(getPaginated.mock.calls[0][1]).toMatchObject({
        project: "p",
        environment: "production",
        query: "",
      });
      expect(get).toHaveBeenCalledWith(
        "/api/0/organizations/org/issues-stats/",
        { groups: ["1", "2"], statsPeriod: "24h" },
      );
      const at = (iso: string) =>
        out.points.find((point) => point.timestamp === iso)?.count;
      expect(at("2026-07-03T09:00:00.000Z")).toBe(3); // 2 + 1 on the same hour
      expect(at("2026-07-03T08:00:00.000Z")).toBe(0); // zero-filled
    });

    it("reports the hourly granularity it served, not the one asked for", async () => {
      getPaginated.mockResolvedValue([buildIssueDto({ id: "1" })]);
      get.mockResolvedValue([
        { id: "1", count: "0", stats: { "24h": [], "14d": null } },
      ]);

      const out = await strategy.getErrorStats(
        "p",
        { from: "2026-07-03T09:10:00Z", to: "2026-07-03T09:40:00Z", interval: "1m" },
        "production",
      );

      // issues-stats has no sub-hour series: a 30-minute window asking for
      // minutes gets one hourly bucket, and says so rather than passing a
      // near-empty minute series off as the truth.
      expect(out.interval).toBe("1h");
      expect(out.points).toHaveLength(1);
    });

    it("reports the daily granularity beyond 24h", async () => {
      getPaginated.mockResolvedValue([buildIssueDto({ id: "1" })]);
      get.mockResolvedValue([
        { id: "1", count: "0", stats: { "24h": null, "14d": [] } },
      ]);

      const out = await strategy.getErrorStats(
        "p",
        { from: "2026-07-01T00:00:00Z", to: "2026-07-05T00:00:00Z", interval: "1h" },
        "production",
      );

      expect(out.interval).toBe("1d");
    });

    it("asks for daily buckets when the period spans more than 24h", async () => {
      getPaginated.mockResolvedValue([buildIssueDto({ id: "1" })]);
      get.mockResolvedValue([{ id: "1", count: "0", stats: { "24h": null, "14d": [] } }]);

      await strategy.getErrorStats(
        "p",
        { from: "2026-07-01T00:00:00Z", to: "2026-07-05T00:00:00Z", interval: "1d" },
        "production",
      );

      expect(get.mock.calls[0][1]).toMatchObject({ statsPeriod: "14d" });
    });

    it("does not call issues-stats when no issue matches the environment", async () => {
      getPaginated.mockResolvedValue([]);

      const out = await strategy.getErrorStats(
        "p",
        { from: "2026-07-03T08:00:00Z", to: "2026-07-03T10:00:00Z", interval: "1h" },
        "production",
      );

      expect(get).not.toHaveBeenCalled();
      expect(out.points.map((point) => point.count)).toEqual([0, 0, 0]);
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
        { id: "e1", eventID: "x", dateCreated: "2026-05-28T00:00:00Z" },
      ]);

      const out = await strategy.getIssueEvents("i1", 5);

      expect(get.mock.calls[0][1]).toMatchObject({ limit: 5 });
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe("e1");
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

  describe("getKpiMeasures", () => {
    it("sums the error stats over the window", async () => {
      get.mockResolvedValue({
        intervals: ["2026-09-09T08:00:00Z", "2026-09-09T08:01:00Z"],
        groups: [{ series: { "sum(quantity)": [4, 7] } }],
      });

      expect(await strategy.getKpiMeasures(30, null)).toEqual({
        value: 11,
        windowMinutes: 30,
      });
    });

    it("queries the provider project id, never the Strapi one", async () => {
      get.mockResolvedValue({ intervals: [], groups: [] });

      await strategy.getKpiMeasures(30, null);

      const params = get.mock.calls[0][1];
      expect(params.project).toBe("p");
      expect(
        new Date(params.end).getTime() - new Date(params.start).getTime(),
      ).toBe(30 * 60_000);
    });

    it("treats a null bucket as zero without coercing the sum to NaN", async () => {
      get.mockResolvedValue({
        intervals: ["2026-09-09T08:00:00Z", "2026-09-09T08:01:00Z"],
        groups: [{ series: { "sum(quantity)": [null, 2] } }],
      });

      expect((await strategy.getKpiMeasures(30, null)).value).toBe(2);
    });

    // The bucket size does not change the sum, only how many buckets the
    // provider has to return.
    it("keeps the buckets coarse on a wide window", async () => {
      get.mockResolvedValue({ intervals: [], groups: [] });

      await strategy.getKpiMeasures(24 * 60, null);

      expect(get.mock.calls[0][1].interval).toBe("1h");
    });

    it("scopes the series per issue when an environment is named", async () => {
      getPaginated.mockResolvedValue([buildIssueDto({ id: "1" })]);
      get.mockResolvedValue([
        { id: "1", count: "3", stats: { "24h": [[1783069200, 3]], "14d": null } },
      ]);

      await strategy.getKpiMeasures(30, "production");

      expect(getPaginated.mock.calls[0][0]).toBe(
        "/api/0/organizations/org/issues/",
      );
      expect(getPaginated.mock.calls[0][1]).toMatchObject({
        environment: "production",
      });
    });

    describe("without a window", () => {
      it("counts the open issues instead of summing a series", async () => {
        getPaginated.mockResolvedValue([
          buildIssueDto({ id: "i1" }),
          buildIssueDto({ id: "i2" }),
        ]);

        expect(await strategy.getKpiMeasures(null, "production")).toEqual({
          value: 2,
          windowMinutes: null,
        });
        expect(get).not.toHaveBeenCalled();
        expect(getPaginated.mock.calls[0][1]).toMatchObject({
          project: "p",
          query: "is:unresolved",
          environment: "production",
        });
      });

      // A capped list would make the total plateau at the cap instead of
      // reporting how many issues are actually open.
      it("caps nothing when counting the open issues", async () => {
        getPaginated.mockResolvedValue([]);

        await strategy.getKpiMeasures(null, null);

        expect(getPaginated.mock.calls[0][1].limit).toBeUndefined();
        expect(getPaginated.mock.calls[0][2]).toEqual({ maxItems: undefined });
      });
    });
  });

  describe("getBlockMeasures", () => {
    it("returns the list shape when no window is asked for", async () => {
      getPaginated.mockResolvedValue([buildIssueDto({ id: "i1" })]);

      const measure = await strategy.getBlockMeasures(null, null, 5);

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.entries).toHaveLength(1);
      expect(measure.windowMinutes).toBeNull();
      expect(getPaginated.mock.calls[0][1].limit).toBe(5);
    });

    // An issue has a detail sheet to open; a log line has none.
    it("marks the list as having a detail sheet", async () => {
      getPaginated.mockResolvedValue([]);

      const measure = await strategy.getBlockMeasures(null, null, null);

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.hasDetail).toBe(true);
    });

    it("defaults the row cap when none is given", async () => {
      getPaginated.mockResolvedValue([]);

      await strategy.getBlockMeasures(null, null, null);

      expect(getPaginated.mock.calls[0][1].limit).toBe(20);
    });

    it("asks the provider for the open issues alone by default", async () => {
      getPaginated.mockResolvedValue([]);

      await strategy.getBlockMeasures(null, null, null);

      expect(getPaginated.mock.calls[0][1].query).toBe("is:unresolved");
    });

    // Both statuses, not the resolved ones alone: an `is:resolved` query would
    // hide the open issues the card exists for.
    it("drops the status filter when the resolved rows are asked for", async () => {
      getPaginated.mockResolvedValue([]);

      await strategy.getBlockMeasures(null, null, null, { showResolved: true });

      expect(getPaginated.mock.calls[0][1].query).toBe("");
    });

    it("carries the resolution status of each row", async () => {
      getPaginated.mockResolvedValue([
        buildIssueDto({ id: "i1", status: "resolved" }),
        buildIssueDto({ id: "i2", status: "unresolved" }),
      ]);

      const measure = await strategy.getBlockMeasures(null, null, null, {
        showResolved: true,
      });

      if (measure.type !== "list") throw new Error("expected a list");
      expect(measure.entries.map((entry) => entry.isResolved)).toEqual([
        true,
        false,
      ]);
    });

    it("ignores the resolved filter on the series branch", async () => {
      get.mockResolvedValue({ intervals: [], groups: [] });

      const measure = await strategy.getBlockMeasures(30, null, null, {
        showResolved: true,
      });

      if (measure.type !== "series") throw new Error("expected a series");
      expect(getPaginated).not.toHaveBeenCalled();
    });

    it("returns one series shape whichever chart will draw it", async () => {
      get.mockResolvedValue({ intervals: [], groups: [] });

      const measure = await strategy.getBlockMeasures(30, null, null);

      if (measure.type !== "series") throw new Error("expected a series");
      expect(measure.windowMinutes).toBe(30);
      expect(measure.series).toHaveLength(1);
      expect(measure.series[0].key).toBe("count");
    });

    it("keeps the buckets coarse on a wide window", async () => {
      get.mockResolvedValue({ intervals: [], groups: [] });

      await strategy.getBlockMeasures(24 * 60, null, null);

      expect(get.mock.calls[0][1].interval).toBe("1h");
    });

    // 30 minutes asks for minutes; the environment-scoped path can only answer
    // hourly, and the measure has to carry that back to the card.
    it("reports the granularity the provider served, not the one asked for", async () => {
      getPaginated.mockResolvedValue([buildIssueDto({ id: "1" })]);
      get.mockResolvedValue([
        { id: "1", count: "3", stats: { "24h": [[1783069200, 3]], "14d": null } },
      ]);

      const measure = await strategy.getBlockMeasures(30, "production", null);

      if (measure.type !== "series") throw new Error("expected a series");
      expect(measure.interval).toBe("1h");
      expect(measure.windowMinutes).toBe(30);
      expect(measure.series[0].points[0].label).toMatch(/^\d{2}h$/);
    });
  });
});
