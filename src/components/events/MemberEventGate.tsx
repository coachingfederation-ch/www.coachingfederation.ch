/**
 * Not-found fallback for event pages. Invite-only events are invisible to the
 * server render, so a signed-in reader (guest list, attendee or manager) gets one client-side retry through
 * their own session before the "not found" message is shown.
 */
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getMemberEvent } from "@/lib/events.functions";
import { isLocale } from "@/i18n/config";
import EventDetailPage, { EventFallback } from "@/pages/EventDetail";

export function MemberEventGate() {
  const params = useParams({ strict: false }) as { slug?: string; locale?: string };
  const locale = isLocale(params.locale) ? params.locale : "en";
  const slug = params.slug ?? "";
  const query = useQuery({
    queryKey: ["member-event", slug, locale],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return null;
      try {
        return await getMemberEvent({ data: { slug, locale } });
      } catch {
        return null;
      }
    },
  });
  if (query.data) {
    return <EventDetailPage event={query.data as Parameters<typeof EventDetailPage>[0]["event"]} />;
  }
  return (
    <EventFallback titleKey="events.detail.notFoundTitle" bodyKey="events.detail.notFoundBody" />
  );
}
