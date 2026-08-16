/**
 * Client-side navigation guards for the staff CMS child routes.
 *
 * These are navigation hygiene, NOT a security boundary: `_staff` is
 * `ssr: false` and the real enforcement stays in RLS plus the server-side
 * guards in `authz.ts`. Their job is to stop a role reaching a screen it can
 * do nothing with — an editor typing `/manage/events`, an organizer typing
 * `/articles`.
 *
 * Checks are EXACT (`hasExactRole`) with a separate admin bypass, because the
 * inherited `isEditor` / `isOrganizer` helpers in `role-model.ts` would let an
 * editor through the Events gate.
 */
import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { myRolesQueryOptions } from "@/lib/roles";
import { hasExactRole } from "@/lib/role-model";
import type { AppRole, RoleSet } from "@/lib/role-model";

/**
 * Where a denied account goes. Order is deliberate and deterministic: an
 * account holding both `editor` and `organizer` always lands on `/articles`.
 * A guard never redirects to a route that same account would be denied on, so
 * this cannot loop.
 */
function fallbackFor(
  roles: RoleSet,
): "/articles" | "/manage/events" | "/vocabularies" | "/member" | "/no-access" {
  if (hasExactRole(roles.roles, "editor")) return "/articles";
  if (hasExactRole(roles.roles, "publisher")) return "/articles";
  if (hasExactRole(roles.roles, "organizer")) return "/manage/events";
  if (hasExactRole(roles.roles, "administrator")) return "/vocabularies";
  if (roles.isMember) return "/member";
  return "/no-access";
}

/**
 * `beforeLoad` body for a staff child route. Passes admins unconditionally,
 * otherwise requires one of `allowed` as an exact grant.
 */
export async function requireStaffAccess(
  queryClient: QueryClient,
  allowed: AppRole[],
): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ to: "/auth", search: { next: undefined } });

  const roles = await queryClient.ensureQueryData(myRolesQueryOptions(data.user.id));
  if (roles.isAdmin) return;
  if (allowed.some((role) => hasExactRole(roles.roles, role))) return;

  throw redirect({ to: fallbackFor(roles) });
}

/** Super-Admin-only screens: members, integration, role administration. */
export const ADMIN_ONLY: AppRole[] = [];
/**
 * Administrator-scoped screens: vocabularies, coach finder, operational
 * structure, Europe Pulse, governance, chat agent insights, assistant
 * knowledge and live chat. Super Admins pass through the admin bypass.
 */
export const PLATFORM_ADMIN_ROLES: AppRole[] = ["administrator"];
/**
 * Editorial screens (`/articles/*`). Publishers belong here too: reviewing and
 * publishing happens in the article editor, and RLS still decides what they
 * may change.
 */
export const ARTICLE_ROLES: AppRole[] = ["editor", "publisher"];
/** Article categories: editorial vocabulary, so editors manage it. */
export const CATEGORY_ROLES: AppRole[] = ["editor"];
/** Event management screens (`/manage/events/*`). */
export const EVENT_ROLES: AppRole[] = ["organizer"];
