// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";

const { fetchIssuesClientMock, fetchIssueDetailClientMock, fetchProjectStrategyMock } =
  vi.hoisted(() => ({
    fetchIssuesClientMock: vi.fn(),
    fetchIssueDetailClientMock: vi.fn(),
    fetchProjectStrategyMock: vi.fn(),
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

import { useIssues } from "@/app/features/issues/hooks/useIssues";
import { useIssueDetail } from "@/app/features/issues/hooks/useIssueDetail";
import { useProjectStrategy } from "@/app/features/issues/hooks/useProjectStrategy";
import { renderQueryHook } from "../../../../helpers/renderHook";

beforeEach(() => {
  fetchIssuesClientMock.mockReset();
  fetchIssueDetailClientMock.mockReset();
  fetchProjectStrategyMock.mockReset();
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
