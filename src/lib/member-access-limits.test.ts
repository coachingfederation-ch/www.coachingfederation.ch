import { describe, expect, it } from "vitest";
import { STAFF_MEMBER_LIMITS } from "./member-access-log.server";

const rule = (a: keyof typeof STAFF_MEMBER_LIMITS, w: number) =>
  STAFF_MEMBER_LIMITS[a].find((r) => r.windowSeconds === w)?.max;

describe("staff member-data limits", () => {
  it("allows 3 CSV exports per hour", () => expect(rule("members_export", 3600)).toBe(3));
  it("allows 5 CSV exports per day", () => expect(rule("members_export", 86400)).toBe(5));
  it("allows 60 member list loads per 15 minutes", () => expect(rule("members_list", 900)).toBe(60));
  it("allows 120 member detail views per 15 minutes", () =>
    expect(rule("member_detail", 900)).toBe(120));
});
