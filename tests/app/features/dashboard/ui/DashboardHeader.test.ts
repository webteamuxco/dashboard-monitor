// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const { fetchIssuesClientMock } = vi.hoisted(() => ({
  fetchIssuesClientMock: vi.fn(),
}));

vi.mock("@/app/features/issues/data-access/fetchIssuesClient", () => ({
  fetchIssuesClient: fetchIssuesClientMock,
}));

// The selectors have their own tests; here only the interactivity gate matters.
vi.mock("@/app/features/dashboard/ui/ProjectSelector", () => ({
  ProjectSelector: () =>
    createElement("div", { "data-testid": "project-selector" }),
}));
vi.mock("@/app/features/dashboard/ui/PannelSelector", () => ({
  PannelSelector: () =>
    createElement("div", { "data-testid": "panel-selector" }),
}));
vi.mock("@/app/features/dashboard/ui/EnvironmentSelector", () => ({
  EnvironmentSelector: () =>
    createElement("div", { "data-testid": "environment-selector" }),
}));
vi.mock("@/app/features/dashboard/ui/WindowSelector", () => ({
  WindowSelector: () =>
    createElement("div", { "data-testid": "window-selector" }),
}));

import { DashboardHeader } from "@/app/features/dashboard/ui/DashboardHeader";
import { renderWithQuery } from "../../../../helpers/renderHook";

const INTERACTIVITY = "NEXT_PUBLIC_DASHBOARD_INTERACTIVITY";

function renderHeader() {
  return renderWithQuery(
    createElement(DashboardHeader, {
      documentId: "project-1",
      panelId: "panel-1",
      limit: 20,
      intervalMs: 30_000,
    }),
  );
}

describe("DashboardHeader", () => {
  beforeEach(() => {
    delete process.env[INTERACTIVITY];
    fetchIssuesClientMock.mockReset();
    fetchIssuesClientMock.mockResolvedValue([]);
  });

  afterEach(() => {
    delete process.env[INTERACTIVITY];
  });

  it("shows every control in interactive mode", () => {
    process.env[INTERACTIVITY] = "true";

    renderHeader();

    expect(screen.getByTestId("project-selector")).toBeDefined();
    expect(screen.getByTestId("panel-selector")).toBeDefined();
    expect(screen.getByTestId("window-selector")).toBeDefined();
    expect(screen.getByRole("button", { name: /Rafraîchir/ })).toBeDefined();
  });

  it("does not mount the environment selector, even interactive", () => {
    // The control is currently out of the header; the environment filter stays
    // at null, meaning "every environment".
    process.env[INTERACTIVITY] = "true";

    renderHeader();

    expect(screen.queryByTestId("environment-selector")).toBeNull();
  });

  it("hides every control on a read-only kiosk", () => {
    process.env[INTERACTIVITY] = "false";

    renderHeader();

    // Nothing here resolves the active panel — that is useActivePanel's job,
    // precisely because this whole block is absent in kiosk mode.
    expect(screen.queryByTestId("project-selector")).toBeNull();
    expect(screen.queryByTestId("panel-selector")).toBeNull();
    expect(screen.queryByTestId("environment-selector")).toBeNull();
    expect(screen.queryByTestId("window-selector")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("defaults to read-only when the flag is unset", () => {
    renderHeader();

    expect(screen.queryByTestId("panel-selector")).toBeNull();
  });

  it("always shows the live badge and the polling cadence", () => {
    renderHeader();

    expect(screen.getByText("EN DIRECT")).toBeDefined();
    expect(screen.getByText(/polling 30s/)).toBeDefined();
  });

  it("polls issues with the panel documentId, not the project's", async () => {
    renderHeader();

    await waitFor(() =>
      expect(fetchIssuesClientMock).toHaveBeenCalledWith("panel-1", 20, null),
    );
  });

  it("invalidates every query when the refresh button is clicked", async () => {
    process.env[INTERACTIVITY] = "true";

    renderHeader();

    await waitFor(() => expect(fetchIssuesClientMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Rafraîchir/ }));

    await waitFor(() => expect(fetchIssuesClientMock).toHaveBeenCalledTimes(2));
  });

  it("renders a placeholder until the first refresh lands", () => {
    fetchIssuesClientMock.mockImplementation(() => new Promise(() => {}));

    renderHeader();

    expect(screen.getByText(/Dernier rafraîchissement: —/)).toBeDefined();
  });

  it("links Admin and Documentation to their configured targets", () => {
    process.env[INTERACTIVITY] = "true";
    process.env.NEXT_PUBLIC_STRAPI_ADMIN_URL = "http://strapi.test";
    process.env.NEXT_PUBLIC_DOCS_SITE_URL = "http://docs.test/docs";

    const { container } = renderHeader();

    const hrefs = Array.from(container.querySelectorAll("a")).map((anchor) =>
      anchor.getAttribute("href"),
    );
    expect(hrefs).toContain("http://strapi.test");
    expect(hrefs).toContain("http://docs.test/docs");

    delete process.env.NEXT_PUBLIC_STRAPI_ADMIN_URL;
    delete process.env.NEXT_PUBLIC_DOCS_SITE_URL;
  });

  it("opens both links in a new tab — the kiosk keeps its dashboard", () => {
    process.env[INTERACTIVITY] = "true";

    const { container } = renderHeader();

    for (const anchor of container.querySelectorAll("a")) {
      expect(anchor.getAttribute("target")).toBe("_blank");
    }
  });
});
