import { describe, expect, it } from "vitest";
import {
  castErrorKey,
  csvCell,
  daysLeft,
  defaultWindow,
  optionKey,
  turnoutPercent,
  validOptions,
  votePhase,
} from "./votes";

const base = { opens_at: "2026-11-01T06:00:00Z", closes_at: "2026-12-01T06:00:00Z" };

describe("votePhase", () => {
  it("is scheduled before the window opens", () => {
    expect(votePhase({ ...base, status: "published" }, new Date("2026-10-31T00:00:00Z"))).toBe(
      "scheduled",
    );
  });
  it("is open inside the window", () => {
    expect(votePhase({ ...base, status: "published" }, new Date("2026-11-15T00:00:00Z"))).toBe(
      "open",
    );
  });
  it("is closed at the closing moment", () => {
    expect(votePhase({ ...base, status: "published" }, new Date(base.closes_at))).toBe("closed");
  });
  it("never opens a draft", () => {
    expect(votePhase({ ...base, status: "draft" }, new Date("2026-11-15T00:00:00Z"))).toBe("draft");
  });
});

describe("defaultWindow", () => {
  it("opens on the first of next month for 30 days", () => {
    const w = defaultWindow(new Date("2026-10-23T08:00:00Z"));
    expect(w.opens_at.slice(0, 10)).toBe("2026-11-01");
    expect(w.closes_at.slice(0, 10)).toBe("2026-12-01");
  });
});

describe("options", () => {
  it("needs at least two distinct options", () => {
    expect(validOptions([{ key: "yes", label: "Yes" }])).toBe(false);
    expect(
      validOptions([
        { key: "a", label: "A" },
        { key: "a", label: "B" },
      ]),
    ).toBe(false);
  });
  it("makes unique keys", () => {
    expect(optionKey("Project A", ["project-a"])).toBe("project-a-2");
  });
});

describe("helpers", () => {
  it("computes turnout", () => {
    expect(turnoutPercent(184, 492)).toBe(37.4);
    expect(turnoutPercent(1, 0)).toBe(0);
  });
  it("counts days left", () => {
    expect(daysLeft(base.closes_at, new Date("2026-11-28T06:00:00Z"))).toBe(3);
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
  });
  it("recognises a second vote", () => {
    expect(castErrorKey('error: already_voted')).toBe("already_voted");
  });
});
