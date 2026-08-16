/**
 * Member Area gate.
 *
 * Entry requires the `member` role, which is only ever granted alongside an
 * explicit `members.auth_user_id` linkage. Holding `editor` as well changes
 * nothing here — that grant only adds the Insights CMS.
 *
 * The gate deliberately trusts the LOCALLY stored session first. The installed
 * volunteer app launches from cold, often before the phone is back on the
 * network; asking the auth server "who is this?" as the first thing turned
 * every flaky launch into an apparent sign-out. A missing stored session is a
 * real sign-out; a failed request is not.
 */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_ROLES, fetchMyRolesOrThrow, myRolesQueryOptions } from "@/lib/roles";
import { useSessionKeepAlive } from "@/lib/session-keepalive";

export const Route = createFileRoute("/_member")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    if (!user) {
      // The installed home-screen app has its own storage container, so it
      // launches signed out. Send it to the QR scanner rather than a password
      // form the volunteer probably cannot complete on a phone.
      if (location.pathname.startsWith("/volunteer-chat")) {
        throw redirect({ to: "/volunteer-login", search: { reason: "expired" as const } });
      }
      throw redirect({ to: "/auth", search: { next: undefined } });
    }

    const options = myRolesQueryOptions(user.id);
    let roles = context.queryClient.getQueryData(options.queryKey) ?? null;
    let rolesKnown = roles !== null;
    try {
      roles = await context.queryClient.ensureQueryData({
        ...options,
        queryFn: () => fetchMyRolesOrThrow(user.id),
      });
      rolesKnown = true;
    } catch {
      // Offline or a transient failure: keep whatever we knew before and let
      // the app render. Data access itself stays protected by RLS.
    }
    if (rolesKnown && roles && !roles.isMember) {
      throw redirect({ to: roles.isStaff ? "/articles" : "/no-access" });
    }
    return { user, roles: roles ?? EMPTY_ROLES };
  },
  component: MemberLayout,
});

function MemberLayout() {
  // Renew the token when the installed app comes back to the foreground.
  useSessionKeepAlive();
  return <Outlet />;
}
