/**
 * Locale-prefixed coach profile route (/:locale/coach/:profileId).
 * Exports: Route. Loads coach data via directory.functions and renders the CoachProfile page.
 */

import { createFileRoute, notFound } from "@tanstack/react-router";
import CoachProfilePage, { CoachFallback } from "@/pages/CoachProfile";
import { getPublicCoachProfile } from "@/lib/directory.functions";
import { coachHead } from "@/lib/coach-head";
import type { Locale } from "@/i18n/config";
import { demoCoachProfile, DEMO_PROFILE_ID } from "@/lib/demo-coach";

export const Route = createFileRoute("/$locale/coach/$profileId")({
  loader: async ({ params }) => {
    // The demo profile is a fixture, not a row: never hit the database for it.
    if (params.profileId === DEMO_PROFILE_ID)
      return { profile: demoCoachProfile(params.locale as Locale) };
    const profile = await getPublicCoachProfile({
      data: { profileId: params.profileId, locale: params.locale as Locale },
    });
    if (!profile) throw notFound();
    return { profile };
  },
  head: ({ loaderData, params }) =>
    coachHead(loaderData, params.locale as Locale, params.profileId),
  errorComponent: () => (
    <CoachFallback
      titleKey="directory.detail.notFoundTitle"
      bodyKey="directory.detail.notFoundBody"
    />
  ),
  notFoundComponent: () => (
    <CoachFallback
      titleKey="directory.detail.notFoundTitle"
      bodyKey="directory.detail.notFoundBody"
    />
  ),
  component: CoachDetail,
});

function CoachDetail() {
  const { profile } = Route.useLoaderData();
  return <CoachProfilePage profile={profile} demo={profile.profile_id === DEMO_PROFILE_ID} />;
}
