// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

const ENV_LIST = "NEXT_PUBLIC_DASHBOARD_ENVIRONMENTS";

/**
 * `ENVIRONMENT_OPTIONS` is read at module scope, so the component and the store
 * are re-imported per case with a fresh env.
 */
async function loadSelector(list?: string) {
  if (list === undefined) delete process.env[ENV_LIST];
  else process.env[ENV_LIST] = list;

  vi.resetModules();

  const [{ EnvironmentSelector }, { useEnvironment }] = await Promise.all([
    import("@/app/features/dashboard/ui/EnvironmentSelector"),
    import("@/app/features/dashboard/state/useEnvironment"),
  ]);

  return { EnvironmentSelector, useEnvironment };
}

describe("EnvironmentSelector", () => {
  beforeEach(() => {
    delete process.env[ENV_LIST];
  });

  afterEach(() => {
    delete process.env[ENV_LIST];
  });

  it("renders nothing when no environment is configured", async () => {
    const { EnvironmentSelector } = await loadSelector();

    const { container } = render(createElement(EnvironmentSelector));

    expect(container.firstChild).toBeNull();
  });

  it("renders one option per environment plus an 'all' entry", async () => {
    const { EnvironmentSelector } = await loadSelector("production,staging");

    render(createElement(EnvironmentSelector));

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Tous", "production", "staging"]);
  });

  it("selects the resolved default on load", async () => {
    const { EnvironmentSelector } = await loadSelector("production,staging");

    render(createElement(EnvironmentSelector));

    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
      "production",
    );
  });

  it("stores the picked environment", async () => {
    const { EnvironmentSelector, useEnvironment } =
      await loadSelector("production,staging");

    render(createElement(EnvironmentSelector));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "staging" },
    });

    expect(useEnvironment.getState().environment).toBe("staging");
  });

  it("maps the 'all' entry back to null, not an empty string", async () => {
    const { EnvironmentSelector, useEnvironment } =
      await loadSelector("production,staging");

    render(createElement(EnvironmentSelector));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });

    // null means "no environment filter"; an empty string would end up in the
    // query key and in the provider request.
    expect(useEnvironment.getState().environment).toBeNull();
  });
});
