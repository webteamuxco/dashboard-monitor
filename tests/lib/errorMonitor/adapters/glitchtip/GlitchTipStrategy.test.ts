import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlitchTipStrategy } from "@/lib/errorMonitor/adapters/glitchtip/GlitchTipStrategy";
import type { GlitchTipClient } from "@/lib/glitchtip/GlitchTipClient";
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

describe("GlitchTipStrategy", () => {
  let get: ReturnType<typeof vi.fn>;
  let client: GlitchTipClient;
  let strategy: GlitchTipStrategy;

  beforeEach(() => {
    get = vi.fn();
    client = { get } as unknown as GlitchTipClient;
    strategy = new GlitchTipStrategy(client, "my-org");
  });

  describe("getIssues", () => {
    it("calls the org issues endpoint and maps the response", async () => {
      get.mockResolvedValue([buildIssueDto({ id: "x" })]);

      const out = await strategy.getIssues("proj-1");

      expect(get).toHaveBeenCalledWith(
        "/api/0/organizations/my-org/issues/",
        expect.objectContaining({ project: "proj-1" }),
      );
      expect(out[0].id).toBe("x");
    });

    it("builds an unresolved query when filters.resolved === false", async () => {
      get.mockResolvedValue([]);

      await strategy.getIssues("proj", { resolved: false, limit: 10 });

      expect(get.mock.calls[0][1]).toMatchObject({
        project: "proj",
        query: "is:unresolved",
        limit: 10,
      });
    });

    it("builds a resolved query when filters.resolved === true", async () => {
      get.mockResolvedValue([]);

      await strategy.getIssues("p", { resolved: true });

      expect(get.mock.calls[0][1]).toMatchObject({ query: "is:resolved" });
    });

    it("combines resolved + level filters", async () => {
      get.mockResolvedValue([]);

      await strategy.getIssues("p", { resolved: false, level: "fatal" });

      expect(get.mock.calls[0][1]).toMatchObject({ query: "is:unresolved level:fatal" });
    });

    it("sends an empty query when filters yield no parts, to include resolved issues", async () => {
      get.mockResolvedValue([]);

      await strategy.getIssues("p", {});

      expect(get.mock.calls[0][1]).toMatchObject({ project: "p", query: "" });
    });

    it("sends an empty query when filters is undefined, to include resolved issues", async () => {
      get.mockResolvedValue([]);

      await strategy.getIssues("p");

      expect(get.mock.calls[0][1]).toMatchObject({ project: "p", query: "" });
    });

    it("forwards the environment as a dedicated query param", async () => {
      get.mockResolvedValue([]);

      await strategy.getIssues("p", { resolved: false, environment: "production" });

      expect(get.mock.calls[0][1]).toMatchObject({ environment: "production" });
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
        "/api/0/organizations/my-org/stats_v2/",
        expect.objectContaining({
          category: "error",
          interval: "1h",
          field: "sum(quantity)",
          project: "p",
          start: "2026-05-28T00:00:00Z",
          end: "2026-05-29T00:00:00Z",
        }),
      );
      expect(out).toEqual([{ timestamp: "2026-05-28T00:00:00Z", count: 3 }]);
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

    it("reconstructs the series from environment-tagged events when an environment is given", async () => {
      get.mockImplementation((path: string) => {
        if (path.includes("/events/")) {
          return Promise.resolve([
            {
              date_created: "2026-07-03T09:15:00Z",
              tags: [{ key: "environment", value: "production" }],
            },
            {
              date_created: "2026-07-03T09:45:00Z",
              tags: [{ key: "environment", value: "production" }],
            },
            {
              date_created: "2026-07-03T09:50:00Z",
              tags: [{ key: "environment", value: "staging" }],
            },
          ]);
        }
        if (path.includes("/issues/")) {
          return Promise.resolve([buildIssueDto({ id: "1" })]);
        }
        return Promise.resolve([]);
      });

      const out = await strategy.getErrorStats(
        "p",
        { from: "2026-07-03T08:00:00Z", to: "2026-07-03T10:00:00Z", interval: "1h" },
        "production",
      );

      const at = (iso: string) => out.find((p) => p.timestamp === iso)?.count;
      expect(at("2026-07-03T09:00:00.000Z")).toBe(2); // two production events
      expect(at("2026-07-03T08:00:00.000Z")).toBe(0); // empty hour → 0, staging excluded
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
    it("calls the comments endpoint and maps the response", async () => {
      get.mockResolvedValue([
        { id: "c1", dateCreated: "2026-05-28T00:00:00Z", data: { text: "hi" } },
      ]);

      const out = await strategy.getIssueComments("i1");

      expect(get).toHaveBeenCalledWith("/api/0/issues/i1/comments/");
      expect(out[0]).toMatchObject({ id: "c1", text: "hi" });
    });
  });
});
