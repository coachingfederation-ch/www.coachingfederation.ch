import { describe, expect, it } from "vitest";
import { AD_DESIGN_VARIANTS, resolveAdDesignVariant } from "./ads";

describe("ad design variants", () => {
  it("offers exactly three styles", () => {
    expect(AD_DESIGN_VARIANTS).toEqual(["editorial", "spotlight", "warm"]);
  });
  it("defaults to editorial when missing", () => {
    expect(resolveAdDesignVariant(undefined)).toBe("editorial");
  });
  it("rejects unknown values", () => {
    expect(resolveAdDesignVariant("neon")).toBe("editorial");
  });
  it("keeps a valid choice", () => {
    expect(resolveAdDesignVariant("spotlight")).toBe("spotlight");
  });
});
