/**
 * Client-side role loading.
 *
 * Access is decided by ROLES, and member data access is decided by the
 * explicit `members.auth_user_id` linkage — never by an email match. Roles are
 * additive: a claimed member granted `editor` keeps full Member Area access
 * and gains the Insights CMS on top (see `role-model.ts`).
 *
 * One cached query serves both the route guards (`ensureQueryData` in
 * `beforeLoad`) and the components (`useMyRoles`), so a navigation costs a
 * single request instead of one per gate plus one per mounted consumer. The
 * cache is invalidated on every auth state change.
 */
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_ROLES, landingPath, toRoleSet } from "./role-model";
import type { AppRole, RoleSet } from "./role-model";

export type { AppRole, RoleSet } from "./role-model";
export { EMPTY_ROLES, MANAGED_ROLE, STAFF_ROLES, landingPath, toRoleSet } from "./role-model";

/** Reads the caller's own roles (RLS: users may only read their own rows). */
export async function fetchMyRoles(userId: string): Promise<RoleSet> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) return EMPTY_ROLES;
  return toRoleSet((data ?? []).map((row) => row.role as AppRole));
}

/**
 * Same read, but a failed request throws instead of degrading to "no roles".
 * Route gates need that distinction: offline is not the same as unauthorised,
 * and silently returning EMPTY_ROLES bounces a signed-in member to /no-access
 * whenever the network hiccups.
 */
export async function fetchMyRolesOrThrow(userId: string): Promise<RoleSet> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return toRoleSet((data ?? []).map((row) => row.role as AppRole));
}

export const myRolesQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: ["my-roles", userId],
    queryFn: () => (userId ? fetchMyRoles(userId) : Promise.resolve(EMPTY_ROLES)),
    staleTime: 5 * 60_000,
  });

export async function landingPathForSession(
  userId: string,
): Promise<"/articles" | "/manage/events" | "/vocabularies" | "/member" | "/no-access"> {
  return landingPath(await fetchMyRoles(userId));
}

/** Client-side role state for nav/affordance gating only — never a boundary. */
export function useMyRoles(): { roles: RoleSet; loading: boolean } {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: 5 * 60_000,
  });
  const userId = session.data ?? null;
  const roles = useQuery({ ...myRolesQueryOptions(userId), enabled: session.isSuccess });

  // A sign-in, sign-out or token refresh can change the answer; nothing else
  // in the app listens for it, so this hook owns the invalidation.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: ["auth-user-id"] });
      void queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  return {
    roles: roles.data ?? EMPTY_ROLES,
    loading: session.isLoading || roles.isLoading,
  };
}
