/**
 * "Advertise with us" (/advertise) — one URL for everybody.
 *
 * SSR renders the public landing. After hydration the session and roles pick
 * the view: signed-out → landing; signed-in without member/advertiser role →
 * profile step; member → Member Area frame; advertiser/staff → advertiser
 * frame. Access to data is enforced server-side (role guard + RLS), not here.
 */
import { createFileRoute, useHydrated, type ErrorComponentProps } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { featureFlagsQueryOptions } from "@/lib/feature-flags";
import { AdvertisingPausedNotice } from "@/components/cms/FeatureOffNotice";
import { Spinner } from "@/design-system/icf-welcome-design-system-a835df";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/lib/roles";
import { MemberShell } from "@/components/member/MemberShell";
import { AdvertiseWizard } from "@/components/member/AdvertiseWizard";
import { AdvertiserShell } from "@/components/advertiser/AdvertiserShell";
import { AdvertiserOnboarding } from "@/components/advertiser/AdvertiserOnboarding";
import { AdvertiseLanding } from "@/components/advertiser/AdvertiseLanding";

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise with us — The Switzerland Chapter of ICF" },
      {
        name: "description",
        content:
          "Reach coaches and organisations across Switzerland: partner packages, e-announcements, and school placements with The Switzerland Chapter of ICF.",
      },
      { property: "og:title", content: "Advertise with us — The Switzerland Chapter of ICF" },
      {
        property: "og:description",
        content:
          "Partner packages, e-announcements, and school placements with The Switzerland Chapter of ICF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featureFlagsQueryOptions),
  component: AdvertisePage,
  errorComponent: AdvertiseError,
});

function AdvertisePage() {
  const hydrated = useHydrated();
  const session = useQuery({
    queryKey: ["auth-session-present"],
    queryFn: async () => Boolean((await supabase.auth.getSession()).data.session),
    enabled: hydrated,
    staleTime: 60_000,
  });
  const { roles, loading } = useMyRoles();
  const flags = useSuspenseQuery(featureFlagsQueryOptions).data;

  // Paused for everyone but platform admins, who keep a preview of the flow.
  if (!flags.advertising && !(hydrated && !loading && roles.isPlatformAdmin)) {
    return <AdvertisingPausedNotice />;
  }

  if (!hydrated || session.data === false) return <AdvertiseLanding />;
  if (session.isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }
  if (roles.isMember) {
    return (
      <MemberShell>
        <AdvertiseWizard />
      </MemberShell>
    );
  }
  if (!roles.isAdvertiser && !roles.isPlatformAdmin) {
    return (
      <AdvertiserShell>
        <AdvertiserOnboarding />
      </AdvertiserShell>
    );
  }
  return (
    <AdvertiserShell>
      <AdvertiseWizard />
    </AdvertiserShell>
  );
}

/**
 * The advertising tables are created when this draft is accepted, so before
 * that the data calls fail. Show a message instead of a blank screen.
 */
function AdvertiseError({ error }: ErrorComponentProps) {
  return (
    <AdvertiserShell>
      <div className="rounded-3xl border border-border bg-card p-8">
        <h1 className="font-heading text-2xl text-foreground">Advertising is not available yet</h1>
        <p className="mt-3 text-muted-foreground">
          This section becomes available once the advertising setup is live. Please try again later.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          {error instanceof Error ? error.message : null}
        </p>
      </div>
    </AdvertiserShell>
  );
}
