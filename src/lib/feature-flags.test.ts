import { describe, expect, it } from "vitest";
import { adClickDestination, parseFeatureFlags } from "./feature-flags";

describe("parseFeatureFlags", () => {
  it("treats a missing value as switched on", () => {
    expect(parseFeatureFlags(null)).toEqual({ europe_pulse: true, advertising: true });
  });

  it("switches Europe Pulse off only when stored as false", () => {
    expect(parseFeatureFlags({ europe_pulse: false, advertising: true }).europe_pulse).toBe(false);
  });
});

describe("adClickDestination", () => {
  it("sends ad clicks to the homepage when advertising is off", () => {
    expect(
      adClickDestination({ europe_pulse: true, advertising: false }, "https://example.com"),
    ).toBe("/");
  });

  it("sends ad clicks to the advertiser when advertising is on", () => {
    expect(
      adClickDestination({ europe_pulse: true, advertising: true }, "https://example.com"),
    ).toBe("https://example.com");
  });
});
