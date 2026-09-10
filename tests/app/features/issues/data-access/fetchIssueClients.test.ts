import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchIssueDetailClient } from "@/app/features/issues/data-access/fetchIssueDetailClient";
import { postIssueCommentClient } from "@/app/features/issues/data-access/postIssueCommentClient";
import {
  calledInit,
  calledUrl,
  mockError,
  mockOk,
  mockUnparseableError,
} from "../../../../helpers/fetchMock";

afterEach(() => {
  vi.unstubAllGlobals();
});

// Both fetchers address a dashboard BLOCK: the issue rows come from a list
// block, and GlitchTip's issue endpoints are organization-scoped, so the block
// id is only there to resolve which instance to ask.

describe("fetchIssueDetailClient", () => {
  it("puts the block id and the issue id in the path", async () => {
    const fetchMock = mockOk({ issue: { id: "i1" } });

    await fetchIssueDetailClient("block-1", "i1");

    expect(calledUrl(fetchMock)).toBe("/api/blocks/block-1/issues/i1");
    expect(calledInit(fetchMock)).toMatchObject({ cache: "no-store" });
  });

  it("encodes ids that are not URL-safe", async () => {
    const fetchMock = mockOk({ issue: { id: "a/b" } });

    await fetchIssueDetailClient("block/1", "a/b");

    expect(calledUrl(fetchMock)).toBe("/api/blocks/block%2F1/issues/a%2Fb");
  });

  it("unwraps the { data } envelope", async () => {
    mockOk({ issue: { id: "i1" }, comments: [] });

    await expect(fetchIssueDetailClient("block-1", "i1")).resolves.toEqual({
      issue: { id: "i1" },
      comments: [],
    });
  });

  it("throws the BFF error message on failure", async () => {
    mockError(502, "GlitchTip request failed: 404");

    await expect(fetchIssueDetailClient("block-1", "i1")).rejects.toThrow(
      "GlitchTip request failed: 404",
    );
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(500);

    await expect(fetchIssueDetailClient("block-1", "i1")).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});

describe("postIssueCommentClient", () => {
  it("POSTs JSON to the issue's comments route", async () => {
    const fetchMock = mockOk({ id: "c1" });

    await postIssueCommentClient("block-1", "i1", { content: "on it" });

    expect(calledUrl(fetchMock)).toBe(
      "/api/blocks/block-1/issues/i1/comments",
    );
    expect(calledInit(fetchMock)).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "on it" }),
      cache: "no-store",
    });
  });

  it("encodes ids that are not URL-safe", async () => {
    const fetchMock = mockOk({ id: "c1" });

    await postIssueCommentClient("block-1", "a/b", { content: "on it" });

    expect(calledUrl(fetchMock)).toBe(
      "/api/blocks/block-1/issues/a%2Fb/comments",
    );
  });

  it("unwraps the created comment from the { data } envelope", async () => {
    mockOk({ id: "c1", text: "on it", authorName: "Mickael" });

    await expect(
      postIssueCommentClient("block-1", "i1", { content: "on it" }),
    ).resolves.toEqual({ id: "c1", text: "on it", authorName: "Mickael" });
  });

  it("throws the BFF validation message on a rejected body", async () => {
    mockError(400, "Body field 'content' is required.");

    await expect(
      postIssueCommentClient("block-1", "i1", { content: "" }),
    ).rejects.toThrow("Body field 'content' is required.");
  });

  it("throws the BFF error message on an upstream failure", async () => {
    mockError(502, "GlitchTip request failed: 403");

    await expect(
      postIssueCommentClient("block-1", "i1", { content: "on it" }),
    ).rejects.toThrow("GlitchTip request failed: 403");
  });

  it("falls back to the status when the error body is unusable", async () => {
    mockUnparseableError(500);

    await expect(
      postIssueCommentClient("block-1", "i1", { content: "on it" }),
    ).rejects.toThrow("Request failed with status 500");
  });
});
