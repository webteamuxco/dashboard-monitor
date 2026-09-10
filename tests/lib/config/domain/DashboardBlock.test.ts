import { describe, it, expect } from "vitest";
import {
  isListBlock,
  isWindowedBlock,
  type DashboardBlockType,
} from "@/lib/config/domain/DashboardBlock";

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
