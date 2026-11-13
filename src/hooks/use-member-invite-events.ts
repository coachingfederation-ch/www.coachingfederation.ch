/**
 * Invite-only events are hidden from the public listing by RLS. Signed-in
 * readers fetch the ones they are on the guest list for after hydration —
 * the session lives in the browser, so SSR can never include them.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listMemberInviteOnlyEvents } from "@/lib/events.functions";
import type { PublicEvent } from "@/lib/events";

export function useMemberInviteEvents(locale: "en" | "de" | "fr" | "it") {
  return useQuery({
    queryKey: ["member-invite-only-events", locale],
    queryFn: async (): Promise<PublicEvent[]> => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return [];
      try {
        return (await listMemberInviteOnlyEvents({ data: { locale } })) as PublicEvent[];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });
}
