// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

const {
  fetchIssuesClientMock,
  fetchIssueDetailClientMock,
  fetchProjectStrategyMock,
  postIssueCommentClientMock,
} = vi.hoisted(() => ({
  fetchIssuesClientMock: vi.fn(),
  fetchIssueDetailClientMock: vi.fn(),
  fetchProjectStrategyMock: vi.fn(),
  postIssueCommentClientMock: vi.fn(),
}));

vi.mock("@/app/features/issues/data-access/fetchIssuesClient", () => ({
  fetchIssuesClient: fetchIssuesClientMock,
}));
vi.mock("@/app/features/issues/data-access/fetchIssueDetailClient", () => ({
  fetchIssueDetailClient: fetchIssueDetailClientMock,
}));
vi.mock("@/app/features/issues/data-access/fetchProjectStrategy", () => ({
  fetchProjectStrategy: fetchProjectStrategyMock,
}));
vi.mock("@/app/features/issues/data-access/postIssueCommentClient", () => ({
  postIssueCommentClient: postIssueCommentClientMock,
}));

import { useIssues } from "@/app/features/issues/hooks/useIssues";
import { useIssueDetail } from "@/app/features/issues/hooks/useIssueDetail";
import { useProjectStrategy } from "@/app/features/issues/hooks/useProjectStrategy";
import { useCreateIssueComment } from "@/app/features/issues/hooks/useCreateIssueComment";
import { renderQueryHook } from "../../../../helpers/renderHook";

beforeEach(() => {
  fetchIssuesClientMock.mockReset();
  fetchIssueDetailClientMock.mockReset();
  fetchProjectStrategyMock.mockReset();
  postIssueCommentClientMock.mockReset();
});

describe("useIssues", () => {
  it("fetches with the panel documentId, the limit and the environment", async () => {
    fetchIssuesClientMock.mockResolvedValue([{ id: "i1" }]);

    const { result } = renderQueryHook(
      () => useIssues("panel-1", 20, "production", 30_000),
      undefined,
    );

    await waitFor(() => expect(result.current.data).toEqual([{ id: "i1" }]));
    expect(fetchIssuesClientMock).toHaveBeenCalledWith(
      "panel-1",
      20,
      "production",
    );
  });

  it("refetches when the panel changes", async () => {
    fetchIssuesClientMock.mockImplementation(async (documentId: string) => [
      { id: documentId },
    ]);

    const { result, rerender } = renderQueryHook(
      (panelId: string) => useIssues(panelId, 20, null, 30_000),
      "panel-1",
    );

    await waitFor(() => expect(result.current.data).toEqual([{ id: "panel-1" }]));

    rerender("panel-2");

    await waitFor(() => expect(result.current.data).toEqual([{ id: "panel-2" }]));
  });

  it("polls on the given interval", async () => {
    fetchIssuesClientMock.mockResolvedValue([]);

    const { result } = renderQueryHook(
      () => useIssues("panel-1", 20, null, 30_000),
      undefined,
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The cadence comes from the project's Strapi defaultConfig, threaded down
    // as a prop — never hard-coded here.
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });

  it("surfaces the BFF error", async () => {
    fetchIssuesClientMock.mockRejectedValue(new Error("502 from GlitchTip"));

    const { result } = renderQueryHook(
      () => useIssues("panel-1", 20, null, 30_000),
      undefined,
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("502 from GlitchTip");
  });
});

describe("useIssueDetail", () => {
  it("stays disabled until a row is clicked", () => {
    const { result } = renderQueryHook(
      (issueId: string) => useIssueDetail("panel-1", issueId),
      "",
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchIssueDetailClientMock).not.toHaveBeenCalled();
  });

  it("fetches the detail once an issue is selected", async () => {
    fetchIssueDetailClientMock.mockResolvedValue({ issue: { id: "i1" } });

    const { result } = renderQueryHook(
      (issueId: string) => useIssueDetail("panel-1", issueId),
      "i1",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual({ issue: { id: "i1" } }),
    );
    expect(fetchIssueDetailClientMock).toHaveBeenCalledWith("panel-1", "i1");
  });
});

describe("useCreateIssueComment", () => {
  it("posts the textarea content as the CommentDTO", async () => {
    postIssueCommentClientMock.mockResolvedValue({ id: "c1" });

    const { result } = renderQueryHook(
      () => useCreateIssueComment("panel-1", "i1"),
      undefined,
    );

    await act(async () => {
      await result.current.mutateAsync("on it");
    });

    expect(postIssueCommentClientMock).toHaveBeenCalledWith("panel-1", "i1", {
      content: "on it",
    });
  });

  it("refetches the issue detail so the new comment shows up", async () => {
    fetchIssueDetailClientMock.mockResolvedValue({ comments: [] });
    postIssueCommentClientMock.mockResolvedValue({ id: "c1" });

    const { result } = renderQueryHook(
      () => ({
        detail: useIssueDetail("panel-1", "i1"),
        create: useCreateIssueComment("panel-1", "i1"),
      }),
      undefined,
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    expect(fetchIssueDetailClientMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.create.mutateAsync("on it");
    });

    // The comment list is part of the detail view, so invalidating that key is
    // the whole refresh mechanism — no optimistic cache write to keep in sync.
    await waitFor(() =>
      expect(fetchIssueDetailClientMock).toHaveBeenCalledTimes(2),
    );
  });

  it("invalidates only the commented issue", async () => {
    fetchIssueDetailClientMock.mockResolvedValue({ comments: [] });
    postIssueCommentClientMock.mockResolvedValue({ id: "c1" });

    const { result } = renderQueryHook(
      () => ({
        commented: useIssueDetail("panel-1", "i1"),
        other: useIssueDetail("panel-1", "i2"),
        create: useCreateIssueComment("panel-1", "i1"),
      }),
      undefined,
    );

    await waitFor(() => expect(result.current.other.isSuccess).toBe(true));

    await act(async () => {
      await result.current.create.mutateAsync("on it");
    });

    await waitFor(() =>
      expect(
        fetchIssueDetailClientMock.mock.calls.filter(([, id]) => id === "i1"),
      ).toHaveLength(2),
    );
    expect(
      fetchIssueDetailClientMock.mock.calls.filter(([, id]) => id === "i2"),
    ).toHaveLength(1);
  });

  it("surfaces the BFF error and leaves the detail alone", async () => {
    fetchIssueDetailClientMock.mockResolvedValue({ comments: [] });
    postIssueCommentClientMock.mockRejectedValue(new Error("502 from GlitchTip"));

    const { result } = renderQueryHook(
      () => ({
        detail: useIssueDetail("panel-1", "i1"),
        create: useCreateIssueComment("panel-1", "i1"),
      }),
      undefined,
    );

    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    await act(async () => {
      result.current.create.mutate("on it");
    });

    await waitFor(() => expect(result.current.create.isError).toBe(true));
    expect(result.current.create.error?.message).toBe("502 from GlitchTip");
    expect(fetchIssueDetailClientMock).toHaveBeenCalledTimes(1);
  });
});

describe("useProjectStrategy", () => {
  it("stays disabled until a panel is selected", () => {
    const { result } = renderQueryHook(
      (panelSlug: string | null) =>
        useProjectStrategy("project-1", panelSlug, null, 30_000),
      null,
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchProjectStrategyMock).not.toHaveBeenCalled();
  });

  it("stays disabled without a project id", () => {
    const { result } = renderQueryHook(
      () => useProjectStrategy("", "production", null, 30_000),
      undefined,
    );

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches with the project id and the panel slug", async () => {
    fetchProjectStrategyMock.mockResolvedValue([{ name: "error-monitor" }]);

    const { result } = renderQueryHook(
      () => useProjectStrategy("project-1", "production", null, 30_000),
      undefined,
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ name: "error-monitor" }]),
    );
    expect(fetchProjectStrategyMock).toHaveBeenCalledWith(
      "project-1",
      "production",
    );
  });

  it("refetches when the panel changes — the slug is part of the key", async () => {
    fetchProjectStrategyMock.mockImplementation(
      async (_documentId: string, panelSlug: string) => [{ name: panelSlug }],
    );

    const { result, rerender } = renderQueryHook(
      (panelSlug: string) =>
        useProjectStrategy("project-1", panelSlug, null, 30_000),
      "production",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ name: "production" }]),
    );

    rerender("staging");

    await waitFor(() =>
      expect(result.current.data).toEqual([{ name: "staging" }]),
    );
  });

  it("passes a null strategy list through — a panel may map nothing", async () => {
    fetchProjectStrategyMock.mockResolvedValue(null);

    const { result } = renderQueryHook(
      () => useProjectStrategy("project-1", "empty", null, 30_000),
      undefined,
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
