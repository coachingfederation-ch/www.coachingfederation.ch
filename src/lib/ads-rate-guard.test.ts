import { describe, expect, it } from "vitest";
import { isRateCardLocked, rateCardChangeableFrom } from "./ads";

describe("rate card three-month price guard", () => {
  it("unlocks exactly three months after the card took effect", () => {
    expect(rateCardChangeableFrom("2026-08-24")).toBe("2026-11-24");
  });
  it("blocks a change one day before the guard ends", () => {
    expect(isRateCardLocked("2026-08-24", "2026-11-23")).toBe(true);
  });
  it("allows a change on the day the guard ends", () => {
    expect(isRateCardLocked("2026-08-24", "2026-11-24")).toBe(false);
  });
});
