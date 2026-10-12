import { describe, expect, it } from "vitest";
import { computeRoi, convertCurrency, DEFAULT_INPUTS } from "./roi-model";

describe("computeRoi", () => {
  it("enrols 35% of employees for a coaching-culture programme", () => {
    expect(computeRoi(DEFAULT_INPUTS).participants).toBe(420);
  });

  it("adds 15% internal time on top of the programme cost", () => {
    const r = computeRoi(DEFAULT_INPUTS);
    expect(r.programmeCost).toBe(420 * 1400);
    expect(r.cost).toBeCloseTo(420 * 1400 * 1.15);
  });

  it("drops internal time when switched off", () => {
    const r = computeRoi({ ...DEFAULT_INPUTS, internalTime: false });
    expect(r.cost).toBe(r.programmeCost);
  });

  it("discounts the gross return by the overlap percentage", () => {
    const r = computeRoi(DEFAULT_INPUTS);
    expect(r.benefit).toBeCloseTo(r.gross * 0.85);
  });

  it("reports no payback when the programme costs far more than it returns", () => {
    expect(computeRoi({ ...DEFAULT_INPUTS, costPer: 1_000_000 }).payback).toBeNull();
  });
});

describe("paybackCurve", () => {
  it("has 36 months and first turns non-negative at the payback month", () => {
    const r = computeRoi(DEFAULT_INPUTS);
    expect(r.paybackCurve).toHaveLength(36);
    expect(r.paybackCurve.findIndex((v) => v >= 0) + 1).toBe(r.payback);
  });
});

describe("convertCurrency", () => {
  it("converts CHF salary to EUR at 0.95, rounded to the nearest thousand", () => {
    expect(convertCurrency(DEFAULT_INPUTS, "CHF", "EUR").salary).toBe(124000);
  });
});
