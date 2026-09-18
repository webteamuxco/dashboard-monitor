// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { ShowResolvedToggle } from "@/app/features/blocks/ui/card/ShowResolvedToggle";

function renderToggle(showResolved: boolean, onToggle = vi.fn()) {
  render(createElement(ShowResolvedToggle, { showResolved, onToggle }));
  return { toggle: screen.getByRole("switch"), onToggle };
}

describe("ShowResolvedToggle", () => {
  it("reports the current state to assistive technology", () => {
    const { toggle } = renderToggle(true);

    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("asks for the resolved rows when it is off", () => {
    const { toggle, onToggle } = renderToggle(false);

    toggle.click();

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("asks for them to be hidden again when it is on", () => {
    const { toggle, onToggle } = renderToggle(true);

    toggle.click();

    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
