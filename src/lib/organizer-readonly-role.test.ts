import { describe, expect, it } from "vitest";
import { MANAGED_ROLES, STAFF_ROLES, toRoleSet } from "./role-model";
import { EVENT_ROLES, EVENT_VIEW_ROLES } from "./staff-guard";

describe("organizer_readonly role", () => {
  it("reaches the staff area and event screens, but is not an organizer", () => {
    const r = toRoleSet(["organizer_readonly"]);
    expect(r.isStaff).toBe(true);
    expect(r.isEventViewer).toBe(true);
    expect(r.isOrganizer).toBe(false);
    expect(r.isEventReadOnly).toBe(true);
  });
  it("adds up with organizer: organizer rights win", () => {
    const r = toRoleSet(["organizer_readonly", "organizer"]);
    expect(r.isOrganizer).toBe(true);
    expect(r.isEventReadOnly).toBe(false);
  });
  it("is assignable and only gets view routes", () => {
    expect(MANAGED_ROLES).toContain("organizer_readonly");
    expect(STAFF_ROLES).toContain("organizer_readonly");
    expect(EVENT_VIEW_ROLES).toContain("organizer_readonly");
    expect(EVENT_ROLES).not.toContain("organizer_readonly");
  });
});
