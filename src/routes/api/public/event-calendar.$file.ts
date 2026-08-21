/**
 * Serves the calendar entry for a published event as a downloadable .ics file
 * (`/api/public/event-calendar/<event-id>.ics`).
 *
 * Public by design: it is the "Add to calendar" download on the event page, so
 * a visitor needs no session. Only published events are readable and the body
 * carries public event content alone — never attendee data. The per-attendee
 * variant stays at `/api/public/calendar/<registration-id>.ics`.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/event-calendar/$file")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = String(params.file ?? "").replace(/\.ics$/i, "");
        if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

        const lang = new URL(request.url).searchParams.get("lang");
        const { buildPublicEventIcs } = await import("@/lib/event-calendar.server");
        const ics = await buildPublicEventIcs(id, lang);
        if (!ics) return new Response("Not found", { status: 404 });

        return new Response(ics, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="event.ics"',
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
