import { describe, expect, it } from "vitest";
import { capList, isDigestDue, normaliseSections } from "./board-digest";

// Monday, October 19, 2026, 7:30 a.m. Zurich (UTC+2) = 05:30 UTC.
const MONDAY_7_ZURICH = new Date("2026-10-19T05:30:00Z");
const base = { enabled: true, cadence: "weekly" as const, weekday: 1, hour: 7, lastSentAt: null };

describe("isDigestDue", () => {
  it("sends on Monday at 7 a.m. Zurich time", () => {
    expect(isDigestDue(base, MONDAY_7_ZURICH)).toBe(true);
  });
  it("does not send at another hour", () => {
    expect(isDigestDue(base, new Date("2026-10-19T07:30:00Z"))).toBe(false);
  });
  it("does not send on another weekday", () => {
    expect(isDigestDue(base, new Date("2026-10-20T05:30:00Z"))).toBe(false);
  });
  it("does not send when switched off", () => {
    expect(isDigestDue({ ...base, enabled: false }, MONDAY_7_ZURICH)).toBe(false);
  });
  it("skips a weekly send when one went out two days ago", () => {
    expect(isDigestDue({ ...base, lastSentAt: "2026-10-17T05:30:00Z" }, MONDAY_7_ZURICH)).toBe(
      false,
    );
  });
  it("sends weekly again seven days later", () => {
    expect(isDigestDue({ ...base, lastSentAt: "2026-10-12T05:30:00Z" }, MONDAY_7_ZURICH)).toBe(
      true,
    );
  });
  it("every two weeks skips the week after a send", () => {
    expect(
      isDigestDue(
        { ...base, cadence: "biweekly", lastSentAt: "2026-10-12T05:30:00Z" },
        MONDAY_7_ZURICH,
      ),
    ).toBe(false);
  });
  it("every two weeks sends 14 days later", () => {
    expect(
      isDigestDue(
        { ...base, cadence: "biweekly", lastSentAt: "2026-10-05T05:30:00Z" },
        MONDAY_7_ZURICH,
      ),
    ).toBe(true);
  });
});

describe("sections and lists", () => {
  it("keeps a switched-off section off and fills missing ones", () => {
    expect(normaliseSections({ members: false })).toEqual({
      members: false,
      articles: true,
      events: true,
      assistant: true,
      operations: true,
    });
  });
  it("caps lists at 15 and counts the rest", () => {
    const list = capList(Array.from({ length: 23 }, (_, i) => ({ primary: String(i) })));
    expect(list.items).toHaveLength(15);
    expect(list.more).toBe(8);
  });
});
