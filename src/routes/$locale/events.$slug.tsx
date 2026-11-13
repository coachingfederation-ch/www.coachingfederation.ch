/**
 * Locale-prefixed event detail route (/:locale/events/:slug).
 * Exports: Route. Loads event data via events.functions and renders EventDetailPage.
 */

import { createFileRoute, notFound } from "@tanstack/react-router";
import EventDetailPage, { EventFallback } from "@/pages/EventDetail";
import { MemberEventGate } from "@/components/events/MemberEventGate";
import { getPublicEvent } from "@/lib/events.functions";
import { eventHead } from "@/lib/event-head";
import type { Locale } from "@/i18n/config";

export const Route = createFileRoute("/$locale/events/$slug")({
  // `?invite=<token>` from an invitation email unlocks an invite-only event.
  validateSearch: (search: Record<string, unknown>): { invite?: string } =>
    typeof search["invite"] === "string" ? { invite: search["invite"] } : {},
  loaderDeps: ({ search }) => ({ invite: search.invite }),
  loader: async ({ params, deps }) => {
    const event = await getPublicEvent({
      data: { slug: params.slug, locale: params.locale as Locale, invite: deps.invite ?? null },
    });
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData, params }) => eventHead(loaderData, params.locale as Locale, params.slug),
  errorComponent: () => (
    <EventFallback titleKey="events.detail.errorTitle" bodyKey="events.detail.errorBody" />
  ),
  notFoundComponent: () => <MemberEventGate />,
  component: LocaleEventDetailRoute,
});

function LocaleEventDetailRoute() {
  return <EventDetailPage event={Route.useLoaderData().event} />;
}
