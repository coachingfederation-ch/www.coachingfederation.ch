/**
 * Serves the calendar entry for one registration as a downloadable .ics file
 * (`/api/public/calendar/<registration-id>.ics`).
 *
 * Public because it is linked from the confirmation email, which the attendee
 * may open on any device without a session. The registration id is an
 * unguessable UUID and the response carries only public event content — never
 * attendee details.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/calendar/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = String(params.file ?? "").replace(/\.ics$/i, "");
        if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

        const { buildRegistrationIcs } = await import("@/lib/event-confirmation.server");
        const ics = await buildRegistrationIcs(id);
        if (!ics) return new Response("Not found", { status: 404 });

        return new Response(ics, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="event.ics"',
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
