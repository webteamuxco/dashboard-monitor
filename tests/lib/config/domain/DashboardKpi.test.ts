import { describe, it, expect } from "vitest";
import { isWindowedKpi } from "@/lib/config/domain/DashboardKpi";

// This predicate is the whole contract: it decides whether a KPI's measure is
// scoped to the project's window presets, so every card and its query key hang
// off it. Widening it re-windows every total silently.
describe("isWindowedKpi", () => {
  it("windows an interval KPI", () => {
    expect(isWindowedKpi("interval")).toBe(true);
  });

  it("reads a list KPI as a total", () => {
    expect(isWindowedKpi("list")).toBe(false);
  });

  it("reads an unset type as a total", () => {
    expect(isWindowedKpi(null)).toBe(false);
  });
});
