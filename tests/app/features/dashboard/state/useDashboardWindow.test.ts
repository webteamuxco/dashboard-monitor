import { describe, it, expect, beforeEach } from "vitest";
import {
  useDashboardWindow,
  isDashboardInteractive,
  formatWindowLabel,
} from "@/app/features/dashboard/state/useDashboardWindow";
import {
  DEFAULT_WINDOW_PRESETS,
  presetsFromTimeInterval,
  readDefaultWindowMinutesFromEnv,
} from "@/app/features/dashboard/state/windowPresets";

describe("useDashboardWindow store", () => {
  beforeEach(() => {
    useDashboardWindow.setState({
      presets: [...DEFAULT_WINDOW_PRESETS],
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

  it("defaults to the canonical preset list (30m, 1h, 12h, 24h)", () => {
    const presets = useDashboardWindow.getState().presets;
    expect(presets.map((p) => p.minutes)).toEqual([30, 60, 720, 1440]);
    expect(presets.map((p) => p.label)).toEqual(["30m", "1h", "12h", "24h"]);
  });

  it("replaces presets and window via hydrateFromStrapi", () => {
    useDashboardWindow.getState().hydrateFromStrapi(
      [{ minutes: 15, label: "15m" }],
      15,
    );

    const state = useDashboardWindow.getState();
    expect(state.presets).toEqual([{ minutes: 15, label: "15m" }]);
    expect(state.windowMinutes).toBe(15);
  });
});

describe("presetsFromTimeInterval", () => {
  it("converts every interval unit to minutes", () => {
    const { presets } = presetsFromTimeInterval([
      { duration: 120, interval: "seconds" },
      { duration: 45, interval: "minutes" },
      { duration: 2, interval: "hours" },
      { duration: 1, interval: "days" },
    ]);

    expect(presets.map((p) => p.minutes)).toEqual([2, 45, 120, 1440]);
    expect(presets.map((p) => p.label)).toEqual(["2m", "45m", "2h", "24h"]);
  });

  it("initial window is the first resolved preset", () => {
    const { initialWindowMinutes } = presetsFromTimeInterval([
      { duration: 3, interval: "hours" },
      { duration: 30, interval: "minutes" },
    ]);

    expect(initialWindowMinutes).toBe(180);
  });

  it("drops intervals that round down to zero minutes", () => {
    const { presets } = presetsFromTimeInterval([
      { duration: 20, interval: "seconds" },
      { duration: 10, interval: "minutes" },
    ]);

    expect(presets.map((p) => p.minutes)).toEqual([10]);
  });

  it("falls back to default presets when no interval is provided", () => {
    const fromNull = presetsFromTimeInterval(null);
    const fromEmpty = presetsFromTimeInterval([]);

    expect(fromNull.presets).toEqual([...DEFAULT_WINDOW_PRESETS]);
    expect(fromEmpty.presets).toEqual([...DEFAULT_WINDOW_PRESETS]);
  });
});

describe("readDefaultWindowMinutesFromEnv", () => {
  const ENV = "NEXT_PUBLIC_DASHBOARD_RESERVATIONS_WINDOW_MINUTES";

  beforeEach(() => {
    delete process.env[ENV];
  });

  it("defaults to 30 minutes when unset", () => {
    expect(readDefaultWindowMinutesFromEnv()).toBe(30);
  });

  it("reads a positive integer", () => {
    process.env[ENV] = "120";

    expect(readDefaultWindowMinutesFromEnv()).toBe(120);
  });

  it("rejects zero, negatives and non-integers", () => {
    for (const raw of ["0", "-15", "12.5", "abc", ""]) {
      process.env[ENV] = raw;
      expect(readDefaultWindowMinutesFromEnv()).toBe(30);
    }
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

  it("formats whole-day multiples above 24h in days", () => {
    expect(formatWindowLabel(2880)).toBe("2d");
    expect(formatWindowLabel(10080)).toBe("7d");
  });

  it("keeps 24h in hours and non-day multiples in hours", () => {
    expect(formatWindowLabel(1440)).toBe("24h");
    expect(formatWindowLabel(2160)).toBe("36h");
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
