import { describe, expect, it } from "vitest";
import { landingPath, toRoleSet } from "./role-model";

describe("landingPath for external advertisers", () => {
  it("sends an advertiser-only account to /advertise", () => {
    expect(landingPath(toRoleSet(["advertiser"]))).toBe("/advertise");
  });
  it("keeps a member who is also an advertiser in the Member Area", () => {
    expect(landingPath(toRoleSet(["member", "advertiser"]))).toBe("/member");
  });
  it("never treats an advertiser as staff or member", () => {
    const r = toRoleSet(["advertiser"]);
    expect(r.isStaff).toBe(false);
    expect(r.isMember).toBe(false);
  });
});
