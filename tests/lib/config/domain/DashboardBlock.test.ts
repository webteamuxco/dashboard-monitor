import { describe, it, expect } from "vitest";
import {
  canFilterResolved,
  isListBlock,
  isWindowedBlock,
  type DashboardBlock,
  type DashboardBlockType,
} from "@/lib/config/domain/DashboardBlock";
import type { MonitorStrategy } from "@/lib/config/domain/MonitorStrategy";

describe("isWindowedBlock", () => {
  it.each<DashboardBlockType>(["rate", "bar", "stackedBar"])(
    "asks for a window for a %s block — all three draw a time series",
    (type) => {
      expect(isWindowedBlock(type)).toBe(true);
    },
  );

  it("asks for none for a list block", () => {
    expect(isWindowedBlock("list")).toBe(false);
  });

  it("asks for none when Strapi declares no type", () => {
    expect(isWindowedBlock(null)).toBe(false);
  });
});

describe("isListBlock", () => {
  it("only holds for the list type", () => {
    expect(isListBlock("list")).toBe(true);
    expect(isListBlock("rate")).toBe(false);
    expect(isListBlock("bar")).toBe(false);
    expect(isListBlock("stackedBar")).toBe(false);
    expect(isListBlock(null)).toBe(false);
  });
});

describe("canFilterResolved", () => {
  function block(
    type: DashboardBlockType | null,
    strategy?: MonitorStrategy,
  ): DashboardBlock {
    return {
      id: "block-1",
      slug: "issues",
      name: "issues",
      title: "Issues",
      description: "",
      icon: "bug",
      level: "error",
      order: 1,
      type,
      strategy,
    };
  }

  const errorStrategy: MonitorStrategy = { kind: "error-monitor", id: "s1" };
  const logStrategy: MonitorStrategy = {
    kind: "log-monitor",
    id: "s2",
    tags: [],
  };

  it("holds for an error-monitor list, the only rows carrying a status", () => {
    expect(canFilterResolved(block("list", errorStrategy))).toBe(true);
  });

  it("does not hold for a log-monitor list — a log line is never resolved", () => {
    expect(canFilterResolved(block("list", logStrategy))).toBe(false);
  });

  it("does not hold for a series, which shows no issue to hide", () => {
    expect(canFilterResolved(block("bar", errorStrategy))).toBe(false);
  });

  it("does not hold when Strapi declares no strategy", () => {
    expect(canFilterResolved(block("list"))).toBe(false);
  });
});
