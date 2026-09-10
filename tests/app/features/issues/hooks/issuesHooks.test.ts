// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

const {
  fetchIssueDetailClientMock,
  postIssueCommentClientMock,
} = vi.hoisted(() => ({
  fetchIssueDetailClientMock: vi.fn(),
  postIssueCommentClientMock: vi.fn(),
}));

vi.mock("@/app/features/issues/data-access/fetchIssueDetailClient", () => ({
  fetchIssueDetailClient: fetchIssueDetailClientMock,
}));
vi.mock("@/app/features/issues/data-access/postIssueCommentClient", () => ({
  postIssueCommentClient: postIssueCommentClientMock,
}));

import { useIssueDetail } from "@/app/features/issues/hooks/useIssueDetail";
import { useCreateIssueComment } from "@/app/features/issues/hooks/useCreateIssueComment";
import { renderQueryHook } from "../../../../helpers/renderHook";

beforeEach(() => {
  fetchIssueDetailClientMock.mockReset();
  postIssueCommentClientMock.mockReset();
});

describe("useIssueDetail", () => {
  it("stays disabled until a row is clicked", () => {
    const { result } = renderQueryHook(
      (issueId: string) => useIssueDetail("block-1", issueId),
      "",
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchIssueDetailClientMock).not.toHaveBeenCalled();
  });

  it("fetches the detail once an issue is selected", async () => {
    fetchIssueDetailClientMock.mockResolvedValue({ issue: { id: "i1" } });

    const { result } = renderQueryHook(
      (issueId: string) => useIssueDetail("block-1", issueId),
      "i1",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual({ issue: { id: "i1" } }),
    );
    expect(fetchIssueDetailClientMock).toHaveBeenCalledWith("block-1", "i1");
  });
});

describe("useCreateIssueComment", () => {
  it("posts the textarea content as the CommentDTO", async () => {
    postIssueCommentClientMock.mockResolvedValue({ id: "c1" });

    const { result } = renderQueryHook(
      () => useCreateIssueComment("block-1", "i1"),
      undefined,
    );

    await act(async () => {
      await result.current.mutateAsync("on it");
    });

    expect(postIssueCommentClientMock).toHaveBeenCalledWith("block-1", "i1", {
      content: "on it",
    });
  });

  it("refetches the issue detail so the new comment shows up", async () => {
    fetchIssueDetailClientMock.mockResolvedValue({ comments: [] });
    postIssueCommentClientMock.mockResolvedValue({ id: "c1" });

    const { result } = renderQueryHook(
      () => ({
        detail: useIssueDetail("block-1", "i1"),
        create: useCreateIssueComment("block-1", "i1"),
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
        commented: useIssueDetail("block-1", "i1"),
        other: useIssueDetail("block-1", "i2"),
        create: useCreateIssueComment("block-1", "i1"),
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
        detail: useIssueDetail("block-1", "i1"),
        create: useCreateIssueComment("block-1", "i1"),
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

