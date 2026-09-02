// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import type { Project } from "@/lib/config/domain/Project";
import type { ProjectSummary } from "@/lib/config/domain/ProjectSummary";

const { fetchProjectsClientMock, fetchProjectConfigClientMock } = vi.hoisted(
  () => ({
    fetchProjectsClientMock: vi.fn(),
    fetchProjectConfigClientMock: vi.fn(),
  }),
);

vi.mock("@/app/features/config/data-access/fetchProjectsClient", () => ({
  fetchProjectsClient: fetchProjectsClientMock,
}));

vi.mock("@/app/features/config/data-access/fetchProjectConfigClient", () => ({
  fetchProjectConfigClient: fetchProjectConfigClientMock,
}));

import { useActiveProject } from "@/app/features/dashboard/hooks/useActiveProject";
import { useSelectedProject } from "@/app/features/dashboard/state/useSelectedProject";
import { renderQueryHook } from "../../../../helpers/renderHook";

const PROJECT_KEY = "dashboard-selected-project";
const FALLBACK_INTERVAL = 30_000;

function summary(documentId: string): ProjectSummary {
  return {
    documentId,
    title: documentId,
    slug: documentId,
    publishedAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return { documentId: "project-1", slug: "uxco", ...overrides };
}

function renderActiveProject(initialDocumentId = "project-1") {
  return renderQueryHook(
    (documentId: string) => useActiveProject(documentId, FALLBACK_INTERVAL),
    initialDocumentId,
  );
}

describe("useActiveProject", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchProjectsClientMock.mockReset();
    fetchProjectConfigClientMock.mockReset();
    fetchProjectConfigClientMock.mockResolvedValue(project());
    useSelectedProject.setState({ documentId: null });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("starts from the server-resolved project so the hydrated keys match", () => {
    fetchProjectsClientMock.mockResolvedValue([summary("project-1")]);

    const { result } = renderActiveProject();

    expect(result.current.documentId).toBe("project-1");
  });

  it("restores the persisted project once the catalog is known", async () => {
    localStorage.setItem(
      PROJECT_KEY,
      JSON.stringify({ state: { documentId: "project-2" }, version: 0 }),
    );
    fetchProjectsClientMock.mockResolvedValue([
      summary("project-1"),
      summary("project-2"),
    ]);

    const { result } = renderActiveProject();

    await waitFor(() => expect(result.current.documentId).toBe("project-2"));
  });

  it("falls back to the initial project when the persisted one is gone", async () => {
    localStorage.setItem(
      PROJECT_KEY,
      JSON.stringify({ state: { documentId: "deleted" }, version: 0 }),
    );
    fetchProjectsClientMock.mockResolvedValue([
      summary("project-1"),
      summary("project-2"),
    ]);

    const { result } = renderActiveProject();

    await waitFor(() => expect(result.current.documentId).toBe("project-1"));
  });

  it("falls back to the first catalog entry when the initial project is gone too", async () => {
    fetchProjectsClientMock.mockResolvedValue([summary("project-9")]);

    const { result } = renderActiveProject("vanished");

    await waitFor(() => expect(result.current.documentId).toBe("project-9"));
  });

  it("reads the refresh cadence from the project's defaultConfig", async () => {
    fetchProjectsClientMock.mockResolvedValue([summary("project-1")]);
    fetchProjectConfigClientMock.mockResolvedValue(
      project({ defaultConfig: { refreshIntervalMs: 5_000 } }),
    );

    const { result } = renderActiveProject();

    await waitFor(() => expect(result.current.refreshIntervalMs).toBe(5_000));
  });

  it("falls back to the given interval when the project declares none", async () => {
    fetchProjectsClientMock.mockResolvedValue([summary("project-1")]);
    fetchProjectConfigClientMock.mockResolvedValue(project());

    const { result } = renderActiveProject();

    await waitFor(() => expect(fetchProjectConfigClientMock).toHaveBeenCalled());
    expect(result.current.refreshIntervalMs).toBe(FALLBACK_INTERVAL);
  });

  it("fetches the config of the active project", async () => {
    fetchProjectsClientMock.mockResolvedValue([summary("project-1")]);

    renderActiveProject();

    await waitFor(() =>
      expect(fetchProjectConfigClientMock).toHaveBeenCalledWith("project-1"),
    );
  });

  it("keeps the fallback interval while the catalog is still loading", () => {
    fetchProjectsClientMock.mockImplementation(() => new Promise(() => {}));

    const { result } = renderActiveProject();

    expect(result.current.refreshIntervalMs).toBe(FALLBACK_INTERVAL);
  });
});
