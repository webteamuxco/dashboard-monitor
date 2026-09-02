// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchProjectsClientMock } = vi.hoisted(() => ({
  fetchProjectsClientMock: vi.fn(),
}));

vi.mock("@/app/features/config/data-access/fetchProjectsClient", () => ({
  fetchProjectsClient: fetchProjectsClientMock,
}));

import { ProjectSelector } from "@/app/features/dashboard/ui/ProjectSelector";
import { WindowSelector } from "@/app/features/dashboard/ui/WindowSelector";
import { useSelectedProject } from "@/app/features/dashboard/state/useSelectedProject";
import { useDashboardWindow } from "@/app/features/dashboard/state/useDashboardWindow";
import { renderWithQuery } from "../../../../helpers/renderHook";

function summary(documentId: string, title: string) {
  return {
    documentId,
    title,
    slug: documentId,
    publishedAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("ProjectSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchProjectsClientMock.mockReset();
    useSelectedProject.setState({ documentId: null });
  });

  it("renders one option per catalog entry, labelled with its title", async () => {
    fetchProjectsClientMock.mockResolvedValue([
      summary("project-1", "UXCO"),
      summary("project-2", "Other"),
    ]);

    renderWithQuery(
      createElement(ProjectSelector, { fallbackDocumentId: "project-1" }),
    );

    await waitFor(() => expect(screen.getByRole("combobox")).toBeDefined());
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["UXCO", "Other"]);
  });

  it("renders nothing while the catalog is empty", async () => {
    fetchProjectsClientMock.mockResolvedValue([]);

    const { container } = renderWithQuery(
      createElement(ProjectSelector, { fallbackDocumentId: "project-1" }),
    );

    await waitFor(() => expect(fetchProjectsClientMock).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("shows the fallback project until one is selected", async () => {
    fetchProjectsClientMock.mockResolvedValue([
      summary("project-1", "UXCO"),
      summary("project-2", "Other"),
    ]);

    renderWithQuery(
      createElement(ProjectSelector, { fallbackDocumentId: "project-2" }),
    );

    const select = (await waitFor(() =>
      screen.getByRole("combobox"),
    )) as HTMLSelectElement;
    expect(select.value).toBe("project-2");
  });

  it("stores the selection on change", async () => {
    fetchProjectsClientMock.mockResolvedValue([
      summary("project-1", "UXCO"),
      summary("project-2", "Other"),
    ]);

    renderWithQuery(
      createElement(ProjectSelector, { fallbackDocumentId: "project-1" }),
    );

    const select = await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(select, { target: { value: "project-2" } });

    expect(useSelectedProject.getState().documentId).toBe("project-2");
  });
});

describe("WindowSelector", () => {
  beforeEach(() => {
    useDashboardWindow.setState({
      presets: [
        { minutes: 30, label: "30m" },
        { minutes: 360, label: "6h" },
      ],
      windowMinutes: 30,
    });
  });

  it("renders one radio per preset — the Strapi-hydrated list", () => {
    render(createElement(WindowSelector));

    expect(
      screen.getAllByRole("radio").map((radio) => radio.textContent),
    ).toEqual(["30m", "6h"]);
  });

  it("marks the active window as checked", () => {
    render(createElement(WindowSelector));

    expect(screen.getByRole("radio", { name: "30m" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("radio", { name: "6h" }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("sets the window on click", () => {
    render(createElement(WindowSelector));

    fireEvent.click(screen.getByRole("radio", { name: "6h" }));

    expect(useDashboardWindow.getState().windowMinutes).toBe(360);
  });

  it("re-renders from the store when Strapi presets replace the defaults", () => {
    render(createElement(WindowSelector));

    act(() => {
      useDashboardWindow
        .getState()
        .hydrateFromStrapi([{ minutes: 15, label: "15m" }], 15);
    });

    expect(
      screen.getAllByRole("radio").map((radio) => radio.textContent),
    ).toEqual(["15m"]);
  });
});
