import { describe, it, expect, beforeEach } from "vitest";
import {
  useDashboardWindow,
  isDashboardInteractive,
  WINDOW_PRESETS,
  formatWindowLabel,
} from "@/app/features/dashboard/state/useDashboardWindow";

describe("useDashboardWindow store", () => {
  beforeEach(() => {
    useDashboardWindow.setState({
      windowMinutes: 30,
    });
  });

  it("exposes a default windowMinutes value", () => {
    expect(typeof useDashboardWindow.getState().windowMinutes).toBe("number");
    expect(useDashboardWindow.getState().windowMinutes).toBeGreaterThan(0);
  });

  it("updates windowMinutes via setWindowMinutes", () => {
    useDashboardWindow.getState().setWindowMinutes(60);

    expect(useDashboardWindow.getState().windowMinutes).toBe(60);
  });

  it("exposes the canonical preset list (30m, 1h, 12h, 24h)", () => {
    expect(WINDOW_PRESETS.map((p) => p.minutes)).toEqual([30, 60, 720, 1440]);
    expect(WINDOW_PRESETS.map((p) => p.label)).toEqual(["30m", "1h", "12h", "24h"]);
  });
});

describe("formatWindowLabel", () => {
  it("formats sub-hour values in minutes", () => {
    expect(formatWindowLabel(30)).toBe("30m");
  });

  it("formats whole-hour multiples in hours", () => {
    expect(formatWindowLabel(60)).toBe("1h");
    expect(formatWindowLabel(720)).toBe("12h");
    expect(formatWindowLabel(1440)).toBe("24h");
  });

  it("falls back to minutes for non-hour multiples", () => {
    expect(formatWindowLabel(90)).toBe("90m");
  });
});

describe("isDashboardInteractive", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_DASHBOARD_INTERACTIVITY;
  });

  it("returns true when NEXT_PUBLIC_DASHBOARD_INTERACTIVITY === 'true'", () => {
    process.env.NEXT_PUBLIC_DASHBOARD_INTERACTIVITY = "true";

    expect(isDashboardInteractive()).toBe(true);
  });

  it("returns false when NEXT_PUBLIC_DASHBOARD_INTERACTIVITY === 'false'", () => {
    process.env.NEXT_PUBLIC_DASHBOARD_INTERACTIVITY = "false";

    expect(isDashboardInteractive()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_DASHBOARD_INTERACTIVITY is set to any other value", () => {
    process.env.NEXT_PUBLIC_DASHBOARD_INTERACTIVITY = "yes";

    expect(isDashboardInteractive()).toBe(false);
  });
});
