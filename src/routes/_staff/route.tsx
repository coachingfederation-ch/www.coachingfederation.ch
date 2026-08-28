/**
 * Staff/volunteer CMS gate.
 *
 * Entry requires a staff role (admin, editor or organizer). `editor` is an
 * additive grant: a claimed member who holds it passes this gate *and* keeps
 * the Member Area — the two are never mutually exclusive. `ssr: false` because
 * the Supabase session lives in localStorage, which the server cannot read.
 *
 * Roles come from the shared `["my-roles", userId]` query, so entering the
 * shell does not re-request what the components are about to read.
 */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { StaffAssistant } from "@/components/assistant/StaffAssistant";
import { supabase } from "@/integrations/supabase/client";
import { myRolesQueryOptions } from "@/lib/roles";

export const Route = createFileRoute("/_staff")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { next: undefined } });

    const roles = await context.queryClient.ensureQueryData(myRolesQueryOptions(data.user.id));
    if (!roles.isStaff) {
      throw redirect({ to: roles.isMember ? "/member" : "/no-access" });
    }
    return { user: data.user, roles };
  },
  component: () => <Outlet />,
});
