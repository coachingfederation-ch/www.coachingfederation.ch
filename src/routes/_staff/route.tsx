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
import { supabase } from "@/integrations/supabase/client";
import { myRolesQueryOptions } from "@/lib/roles";
import { useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIdleSignOut } from "@/hooks/use-idle-sign-out";
import { useCms } from "@/i18n/cms";

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
  component: StaffShell,
});

function StaffShell() {
  const { t } = useCms();
  const signOut = useCallback(() => {
    const next = window.location.pathname + window.location.search;
    void supabase.auth.signOut().finally(() => {
      window.location.assign(`/auth?next=${encodeURIComponent(next)}`);
    });
  }, []);
  const { phase, stay } = useIdleSignOut(signOut);

  return (
    <>
      <Outlet />
      <AlertDialog open={phase === "warning"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("staffIdle.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("staffIdle.body")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={signOut}>{t("staffIdle.signOut")}</AlertDialogCancel>
            <AlertDialogAction onClick={stay}>{t("staffIdle.stay")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
