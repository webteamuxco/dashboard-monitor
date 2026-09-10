import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchIssuesClient } from "@/app/features/issues/data-access/fetchIssuesClient";
import { fetchIssueDetailClient } from "@/app/features/issues/data-access/fetchIssueDetailClient";
import { fetchProjectStrategy } from "@/app/features/issues/data-access/fetchProjectStrategy";
import { postIssueCommentClient } from "@/app/features/issues/data-access/postIssueCommentClient";
import {
  calledInit,
  calledParams,
  calledUrl,
  mockError,
  mockOk,
  mockUnparseableError,
} from "../../../../helpers/fetchMock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchIssuesClient", () => {
  it("calls /api/issues with the panel documentId and the limit", async () => {
    const fetchMock = mockOk([]);

    await fetchIssuesClient("panel-1", 20);

    expect(calledUrl(fetchMock)).toContain("/api/issues?");
    expect(calledParams(fetchMock)).toEqual({
      documentId: "panel-1",
      limit: "20",
    });
  });

  it("opts out of caching — the dashboard is real-time", async () => {
    const fetchMock = mockOk([]);

    await fetchIssuesClient("panel-1", 20);

    expect(calledInit(fetchMock)).toMatchObject({ cache: "no-store" });
  });

  it("adds the environment only when one is selected", async () => {
    const fetchMock = mockOk([]);

    await fetchIssuesClient("panel-1", 20, "production");
    expect(calledParams(fetchMock)).toMatchObject({ environment: "production" });

    await fetchIssuesClient("panel-1", 20, null);
    expect(calledParams(fetchMock)).not.toHaveProperty("environment");
  });

  it("unwraps the { data } envelope", async () => {
    mockOk([{ id: "i1", title: "boom" }]);

    await expect(fetchIssuesClient("panel-1", 20)).resolves.toEqual([
      { id: "i1", title: "boom" },
    ]);
  });

  it("throws the BFF error message on failure", async () => {
    mockError(502, 'No ErrorMonitorFactory supports type "error-monitor"');

    await expect(fetchIssuesClient("panel-1", 20)).rejects.toThrow(
      'No ErrorMonitorFactory supports type "error-monitor"',
    );
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(500);

    await expect(fetchIssuesClient("panel-1", 20)).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});

describe("fetchIssueDetailClient", () => {
  it("puts the issue id in the path and the panel id in the query", async () => {
    const fetchMock = mockOk({ issue: { id: "i1" } });

    await fetchIssueDetailClient("panel-1", "i1");

    expect(calledUrl(fetchMock)).toContain("/api/issues/i1?");
    expect(calledParams(fetchMock)).toEqual({ documentId: "panel-1" });
  });

  it("encodes an issue id that is not URL-safe", async () => {
    const fetchMock = mockOk({ issue: { id: "a/b" } });

    await fetchIssueDetailClient("panel-1", "a/b");

    expect(calledUrl(fetchMock)).toContain("/api/issues/a%2Fb?");
  });

  it("throws the BFF error message on failure", async () => {
    mockError(502, "GlitchTip request failed: 404");

    await expect(fetchIssueDetailClient("panel-1", "i1")).rejects.toThrow(
      "GlitchTip request failed: 404",
    );
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(500);

    await expect(fetchIssueDetailClient("panel-1", "i1")).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});

describe("postIssueCommentClient", () => {
  it("POSTs JSON to the issue's comments route", async () => {
    const fetchMock = mockOk({ id: "c1" });

    await postIssueCommentClient("panel-1", "i1", { content: "on it" });

    expect(calledUrl(fetchMock)).toContain("/api/issues/i1/comments?");
    expect(calledParams(fetchMock)).toEqual({ documentId: "panel-1" });
    expect(calledInit(fetchMock)).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "on it" }),
      cache: "no-store",
    });
  });

  it("encodes an issue id that is not URL-safe", async () => {
    const fetchMock = mockOk({ id: "c1" });

    await postIssueCommentClient("panel-1", "a/b", { content: "on it" });

    expect(calledUrl(fetchMock)).toContain("/api/issues/a%2Fb/comments?");
  });

  it("unwraps the created comment from the { data } envelope", async () => {
    mockOk({ id: "c1", text: "on it", authorName: "Mickael" });

    await expect(
      postIssueCommentClient("panel-1", "i1", { content: "on it" }),
    ).resolves.toEqual({ id: "c1", text: "on it", authorName: "Mickael" });
  });

  it("throws the BFF validation message on a rejected body", async () => {
    mockError(400, "Body field 'content' is required.");

    await expect(
      postIssueCommentClient("panel-1", "i1", { content: " " }),
    ).rejects.toThrow("Body field 'content' is required.");
  });

  it("throws the BFF error message on an upstream failure", async () => {
    mockError(502, "GlitchTip API error 403 on /api/0/issues/i1/comments/");

    await expect(
      postIssueCommentClient("panel-1", "i1", { content: "on it" }),
    ).rejects.toThrow("GlitchTip API error 403 on /api/0/issues/i1/comments/");
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(500);

    await expect(
      postIssueCommentClient("panel-1", "i1", { content: "on it" }),
    ).rejects.toThrow("Request failed with status 500");
  });
});

describe("fetchProjectStrategy", () => {
  it("calls the project's strategies route with the panel slug", async () => {
    const fetchMock = mockOk([{ name: "error-monitor" }]);

    await fetchProjectStrategy("project-1", "production");

    expect(calledUrl(fetchMock)).toContain(
      "/api/config/projects/project-1/strategies?",
    );
    expect(calledParams(fetchMock)).toEqual({ selectedPanel: "production" });
  });

  it("unwraps the strategy list", async () => {
    mockOk([{ name: "error-monitor" }, { name: "tracker-monitor" }]);

    await expect(fetchProjectStrategy("project-1", "production")).resolves.toEqual(
      [{ name: "error-monitor" }, { name: "tracker-monitor" }],
    );
  });

  it("throws the BFF error message on failure", async () => {
    mockError(502, "Strapi request failed: 401 Unauthorized");

    await expect(
      fetchProjectStrategy("project-1", "production"),
    ).rejects.toThrow("Strapi request failed: 401 Unauthorized");
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(500);

    await expect(
      fetchProjectStrategy("project-1", "production"),
    ).rejects.toThrow("Request failed with status 500");
  });
});
