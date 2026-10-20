import { describe, expect, it } from "vitest";
import { uniqueSlug } from "./articles";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("uniqueSlug", () => {
  it("appends a six-character random tag to the base", () => {
    expect(uniqueSlug("Leadership Breakfast")).toMatch(/^leadership-breakfast-[a-z0-9]{6}$/);
  });

  it("stays within 120 characters and valid slug format", () => {
    const s = uniqueSlug("a".repeat(200) + "-copy");
    expect(s.length).toBeLessThanOrEqual(120);
    expect(s).toMatch(SLUG_RE);
  });

  it("gives different results for the same title", () => {
    expect(uniqueSlug("Same title")).not.toBe(uniqueSlug("Same title"));
  });
});
