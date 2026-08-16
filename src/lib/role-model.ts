/**
 * The single definition of the role vocabulary, shared by client code
 * (`roles.ts`), server-function guards (`authz.ts`) and — in spirit — the
 * `private.has_role / is_editor / is_staff` helpers in the database.
 *
 * Roles are ADDITIVE GRANTS, never a state machine. An account that holds both
 * `member` and `editor` is a member who can also work in the Insights CMS:
 * granting or revoking `editor` never touches `members.auth_user_id`, the
 * `member` grant, or Member Area access.
 *
 * `user` is dormant: its RLS policies still exist and are still enforced, but
 * nothing grants it and no UI surfaces it.
 *
 * Two privileged levels exist. `admin` is the SUPER ADMIN grant: provisioned by
 * migration only, full access to everything including members, integration and
 * role administration. `administrator` is the assignable Administrator grant
 * with a scoped set of areas (vocabularies, coach finder, operational
 * structure, Europe Pulse, governance, chat agent, knowledge, live chat).
 * Keeping them as two distinct grants is deliberate: any check that still asks
 * for `admin` stays Super-Admin-only, so a missed call site narrows access
 * instead of widening it.
 *
 * Client-safe: no imports, no secrets, no I/O.
 */
export type AppRole =
  | "admin"
  | "administrator"
  | "editor"
  | "organizer"
  | "publisher"
  | "member"
  | "user";

/** Roles that may reach the staff CMS. */
export const STAFF_ROLES: AppRole[] = [
  "admin",
  "administrator",
  "editor",
  "organizer",
  "publisher",
];

/** The roles an admin may grant or revoke through the application. */
export const MANAGED_ROLES = ["administrator", "editor", "organizer", "publisher"] as const;
export type ManagedRole = (typeof MANAGED_ROLES)[number];

/** @deprecated use MANAGED_ROLES. Kept so older call sites keep compiling. */
export const MANAGED_ROLE = "editor" as const;

export type RoleSet = {
  roles: AppRole[];
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  isEditor: boolean;
  isOrganizer: boolean;
  isPublisher: boolean;
  isStaff: boolean;
  isMember: boolean;
};

export const EMPTY_ROLES: RoleSet = {
  roles: [],
  isAdmin: false,
  isPlatformAdmin: false,
  isEditor: false,
  isOrganizer: false,
  isPublisher: false,
  isStaff: false,
  isMember: false,
};

export function toRoleSet(roles: AppRole[]): RoleSet {
  const has = (r: AppRole) => roles.includes(r);
  return {
    roles,
    // `isAdmin` stays the Super Admin test — everything gated on it keeps its
    // original, unchanged meaning.
    isAdmin: has("admin"),
    isPlatformAdmin: has("admin") || has("administrator"),
    isEditor: has("admin") || has("editor"),
    // Editors and admins manage every event, so they are organizers too.
    isOrganizer: has("admin") || has("editor") || has("organizer"),
    // Publishing rights are an explicit grant; only admin overrides it.
    isPublisher: has("admin") || has("publisher"),
    isStaff: STAFF_ROLES.some(has),
    isMember: has("member"),
  };
}

/**
 * Exact grant test — deliberately WITHOUT the inheritance baked into
 * `isEditor` / `isOrganizer`. CMS navigation and route guards need to know
 * which role an account literally holds (an editor must not reach Events),
 * so they use this plus an explicit admin bypass.
 */
export function hasExactRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

/**
 * Where a signed-in account lands. Membership is the primary identity, so a
 * member who also holds `editor` goes to their profile; the CMS is the added
 * capability, reachable from the Member Area header.
 */
export function landingPath(
  roles: RoleSet,
): "/articles" | "/manage/events" | "/vocabularies" | "/member" | "/no-access" {
  if (roles.isMember) return "/member";
  // An Administrator without editorial rights starts in their own first area.
  if (
    hasExactRole(roles.roles, "administrator") &&
    !roles.isAdmin &&
    !hasExactRole(roles.roles, "editor") &&
    !hasExactRole(roles.roles, "publisher")
  )
    return "/vocabularies";
  // An organizer-only staff account has no access to /articles — the route
  // guard would bounce them straight back out.
  if (
    roles.isStaff &&
    hasExactRole(roles.roles, "organizer") &&
    !hasExactRole(roles.roles, "editor") &&
    !hasExactRole(roles.roles, "publisher") &&
    !roles.isAdmin
  )
    return "/manage/events";
  if (roles.isStaff) return "/articles";
  return "/no-access";
}
