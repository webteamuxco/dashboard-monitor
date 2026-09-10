// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import type { Project } from "@/lib/config/domain/Project";

// vi.hoisted: vi.mock is lifted above every const, so a factory that reads a
// plain top-level variable hits its temporal dead zone.
const { fetchProjectConfigClientMock } = vi.hoisted(() => ({
  fetchProjectConfigClientMock: vi.fn(),
}));

vi.mock("@/app/features/config/data-access/fetchProjectConfigClient", () => ({
  fetchProjectConfigClient: fetchProjectConfigClientMock,
}));

import { useActiveWindow } from "@/app/features/dashboard/hooks/useActiveWindow";
import { useDashboardWindow } from "@/app/features/dashboard/state/useDashboardWindow";
import { DEFAULT_WINDOW_PRESETS } from "@/app/features/dashboard/state/windowPresets";
import { renderQueryHook } from "../../../../helpers/renderHook";

function project(overrides: Partial<Project> = {}): Project {
  return {
    documentId: "project-1",
    slug: "tunnel-reservation",
    defaultConfig: { refreshIntervalMs: 30_000 },
    ...overrides,
  };
}

const HOURLY = project({
  timeInterval: [
    { duration: 1, interval: "hours" },
    { duration: 12, interval: "hours" },
    { duration: 24, interval: "hours" },
  ],
});

const MINUTELY = project({
  documentId: "project-2",
  slug: "loky",
  timeInterval: [
    { duration: 5, interval: "minutes" },
    { duration: 15, interval: "minutes" },
  ],
});

function presetMinutes(): number[] {
  return useDashboardWindow.getState().presets.map((preset) => preset.minutes);
}

describe("useActiveWindow", () => {
  beforeEach(() => {
    fetchProjectConfigClientMock.mockReset();
    useDashboardWindow.setState({
      presets: [...DEFAULT_WINDOW_PRESETS],
      windowMinutes: 30,
    });
  });

  it("applies the presets of the project it is pointed at", async () => {
    fetchProjectConfigClientMock.mockResolvedValue(HOURLY);

    renderQueryHook((documentId: string) => useActiveWindow(documentId), "project-1");

    await waitFor(() => expect(presetMinutes()).toEqual([60, 720, 1440]));
    expect(useDashboardWindow.getState().windowMinutes).toBe(60);
  });

  it("re-applies them when the project changes", async () => {
    fetchProjectConfigClientMock.mockImplementation(async (documentId: string) =>
      documentId === "project-1" ? HOURLY : MINUTELY,
    );

    const { rerender } = renderQueryHook(
      (documentId: string) => useActiveWindow(documentId),
      "project-1",
    );

    await waitFor(() => expect(presetMinutes()).toEqual([60, 720, 1440]));

    rerender("project-2");

    await waitFor(() => expect(presetMinutes()).toEqual([5, 15]));
    expect(useDashboardWindow.getState().windowMinutes).toBe(5);
  });

  it("keeps the selected window when the new project offers it", async () => {
    fetchProjectConfigClientMock.mockImplementation(async (documentId: string) =>
      documentId === "project-1"
        ? HOURLY
        : project({ documentId: "project-3", timeInterval: [
            { duration: 12, interval: "hours" },
            { duration: 2, interval: "days" },
          ] }),
    );

    const { rerender } = renderQueryHook(
      (documentId: string) => useActiveWindow(documentId),
      "project-1",
    );

    await waitFor(() => expect(presetMinutes()).toEqual([60, 720, 1440]));
    useDashboardWindow.getState().setWindowMinutes(720);

    rerender("project-3");

    await waitFor(() => expect(presetMinutes()).toEqual([720, 2880]));
    expect(useDashboardWindow.getState().windowMinutes).toBe(720);
  });

  it("leaves the presets alone while the new project's config is loading", async () => {
    let resolveSecond: ((value: Project) => void) | undefined;
    fetchProjectConfigClientMock.mockImplementation(async (documentId: string) =>
      documentId === "project-1"
        ? HOURLY
        : new Promise<Project>((resolve) => {
            resolveSecond = resolve;
          }),
    );

    const { rerender } = renderQueryHook(
      (documentId: string) => useActiveWindow(documentId),
      "project-1",
    );

    await waitFor(() => expect(presetMinutes()).toEqual([60, 720, 1440]));

    rerender("project-2");

    // No flash back to the built-in defaults between two projects.
    expect(presetMinutes()).toEqual([60, 720, 1440]);

    resolveSecond?.(MINUTELY);
    await waitFor(() => expect(presetMinutes()).toEqual([5, 15]));
  });
});
