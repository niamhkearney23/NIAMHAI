import { describe, expect, it } from "vitest";
import { brandColours, brandWarnings, contrast, DEFAULT_BRAND, inkOn } from "./brand";

describe("brand colours", () => {
  it("measures contrast like WCAG", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("keeps Lawgistics navy and cream for the default palette", () => {
    const c = brandColours(DEFAULT_BRAND);
    expect(c.coverInk).toBe("#F1EBDE");
    expect(c.cardInk).toBe("#171B28");
    expect(brandWarnings(DEFAULT_BRAND)).toEqual([]);
  });

  it("picks readable text on a firm's own colours", () => {
    expect(inkOn("#0B5D3B")).not.toBe("#171B28"); // dark green gets a light ink
    expect(inkOn("#FFD54F")).toBe("#171B28"); // yellow gets navy
  });

  it("warns about colours that cannot carry text", () => {
    expect(brandWarnings({ cover: "#808080", card: "#F1EBDE", accent: "#A8C0EA" })).toHaveLength(1);
    expect(brandWarnings({ cover: "#171B28", card: "#F1EBDE", accent: "#F0EADD" })).toEqual(["The accent barely shows on the other cards."]);
    expect(brandWarnings({ cover: "navy", card: "#F1EBDE", accent: "#A8C0EA" })).toEqual(["Use colours like #171B28."]);
  });
});
