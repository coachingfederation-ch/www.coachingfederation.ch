/**
 * Public event detail route (/events/$slug).
 * Exports: Route. Loads and renders a single public event by slug, including
 * localized head metadata and error handling.
 */

import { createFileRoute, notFound } from "@tanstack/react-router";
import EventDetailPage, { EventFallback } from "@/pages/EventDetail";
import { MemberEventGate } from "@/components/events/MemberEventGate";
import { getPublicEvent } from "@/lib/events.functions";
import { eventHead } from "@/lib/event-head";

export const Route = createFileRoute("/events/$slug")({
  // `?invite=<token>` from an invitation email unlocks an invite-only event.
  validateSearch: (search: Record<string, unknown>): { invite?: string } =>
    typeof search["invite"] === "string" ? { invite: search["invite"] } : {},
  loaderDeps: ({ search }) => ({ invite: search.invite }),
  loader: async ({ params, deps }) => {
    const event = await getPublicEvent({ data: { slug: params.slug, locale: "en", invite: deps.invite ?? null } });
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData, params }) => eventHead(loaderData, "en", params.slug),
  errorComponent: () => (
    <EventFallback titleKey="events.detail.errorTitle" bodyKey="events.detail.errorBody" />
  ),
  notFoundComponent: () => <MemberEventGate />,
  component: EventDetailRoute,
});

function EventDetailRoute() {
  return <EventDetailPage event={Route.useLoaderData().event} />;
}
