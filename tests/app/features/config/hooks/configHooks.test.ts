// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";

const {
  fetchProjectsClientMock,
  fetchProjectConfigClientMock,
  fetchProjectPanelsMock,
} = vi.hoisted(() => ({
  fetchProjectsClientMock: vi.fn(),
  fetchProjectConfigClientMock: vi.fn(),
  fetchProjectPanelsMock: vi.fn(),
}));

vi.mock("@/app/features/config/data-access/fetchProjectsClient", () => ({
  fetchProjectsClient: fetchProjectsClientMock,
}));
vi.mock("@/app/features/config/data-access/fetchProjectConfigClient", () => ({
  fetchProjectConfigClient: fetchProjectConfigClientMock,
}));
vi.mock("@/app/features/config/data-access/fetchProjectPannels", () => ({
  fetchProjectPanels: fetchProjectPanelsMock,
}));

import { useProjects } from "@/app/features/config/hooks/useProjects";
import { useProjectConfig } from "@/app/features/config/hooks/useProjectConfig";
import { usePanels } from "@/app/features/config/hooks/usePannels";
import { configKeys } from "@/app/features/config/queryKeys";
import { renderQueryHook } from "../../../../helpers/renderHook";
import { setTestSearchParams } from "../../../../shims/next-navigation";

beforeEach(() => {
  fetchProjectsClientMock.mockReset();
  fetchProjectConfigClientMock.mockReset();
  fetchProjectPanelsMock.mockReset();
  setTestSearchParams();
});

describe("useProjects", () => {
  it("returns the catalog under the projects key", async () => {
    fetchProjectsClientMock.mockResolvedValue([{ documentId: "project-1" }]);

    const { result } = renderQueryHook(() => useProjects(), undefined);

    await waitFor(() =>
      expect(result.current.data).toEqual([{ documentId: "project-1" }]),
    );
    expect(configKeys.projects()).toEqual(["config", "projects"]);
  });

  it("surfaces the error instead of masking it", async () => {
    fetchProjectsClientMock.mockRejectedValue(new Error("Strapi down"));

    const { result } = renderQueryHook(() => useProjects(), undefined);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Strapi down");
  });
});

describe("useProjectConfig", () => {
  it("fetches the config of the given project", async () => {
    fetchProjectConfigClientMock.mockResolvedValue({ documentId: "project-1" });

    const { result } = renderQueryHook(
      (documentId: string) => useProjectConfig(documentId),
      "project-1",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual({ documentId: "project-1" }),
    );
    expect(fetchProjectConfigClientMock).toHaveBeenCalledWith("project-1");
  });

  it("stays disabled without a project id", () => {
    const { result } = renderQueryHook(
      (documentId: string) => useProjectConfig(documentId),
      "",
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchProjectConfigClientMock).not.toHaveBeenCalled();
  });

  it("refetches when the project changes", async () => {
    fetchProjectConfigClientMock.mockImplementation(async (documentId: string) => ({
      documentId,
    }));

    const { result, rerender } = renderQueryHook(
      (documentId: string) => useProjectConfig(documentId),
      "project-1",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual({ documentId: "project-1" }),
    );

    rerender("project-2");

    await waitFor(() =>
      expect(result.current.data).toEqual({ documentId: "project-2" }),
    );
  });
});

describe("usePanels", () => {
  it("fetches the panels of the given project, dev panels hidden", async () => {
    fetchProjectPanelsMock.mockResolvedValue([{ id: "panel-1" }]);

    const { result } = renderQueryHook(
      (documentId: string) => usePanels(documentId),
      "project-1",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ id: "panel-1" }]),
    );
    expect(fetchProjectPanelsMock).toHaveBeenCalledWith("project-1", false);
    expect(configKeys.pannels("project-1", false)).toEqual([
      "config",
      "pannels",
      "project-1",
      false,
    ]);
  });

  it("asks for the dev panels when ?showDevelopmentPanel=true", async () => {
    setTestSearchParams({ showDevelopmentPanel: "true" });
    fetchProjectPanelsMock.mockResolvedValue([{ id: "panel-dev" }]);

    const { result } = renderQueryHook(
      (documentId: string) => usePanels(documentId),
      "project-1",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ id: "panel-dev" }]),
    );
    expect(fetchProjectPanelsMock).toHaveBeenCalledWith("project-1", true);
  });

  it("treats any other value of the flag as off", async () => {
    setTestSearchParams({ showDevelopmentPanel: "1" });
    fetchProjectPanelsMock.mockResolvedValue([{ id: "panel-1" }]);

    const { result } = renderQueryHook(
      (documentId: string) => usePanels(documentId),
      "project-1",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ id: "panel-1" }]),
    );
    expect(fetchProjectPanelsMock).toHaveBeenCalledWith("project-1", false);
  });

  it("stays disabled without a project id", () => {
    const { result } = renderQueryHook(
      (documentId: string) => usePanels(documentId),
      "",
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchProjectPanelsMock).not.toHaveBeenCalled();
  });

  it("refetches on a project switch — the key carries the project id", async () => {
    // With a key that took no argument, the previous project's panels were
    // served from cache until the 5-minute staleTime expired.
    fetchProjectPanelsMock.mockImplementation(async (documentId: string) => [
      { id: `${documentId}-panel` },
    ]);

    const { result, rerender } = renderQueryHook(
      (documentId: string) => usePanels(documentId),
      "project-1",
    );

    await waitFor(() =>
      expect(result.current.data).toEqual([{ id: "project-1-panel" }]),
    );

    rerender("project-2");

    await waitFor(() =>
      expect(result.current.data).toEqual([{ id: "project-2-panel" }]),
    );
  });
});
