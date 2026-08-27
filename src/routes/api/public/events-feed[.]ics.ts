/**
 * The chapter's subscribable calendar feed
 * (`/api/public/events-feed.ics`, also reachable as `webcal://`).
 *
 * Public by design: a calendar client polls it with no session. Only
 * published, non-internal events are served and the body carries public event
 * content alone — never attendee or member data. Optional `community`,
 * `category`, `region` and `lang` parameters narrow the feed.
 */
import { createFileRoute } from "@tanstack/react-router";
import { isLocale } from "@/i18n/config";

/** Facet slugs are short lowercase identifiers; anything else is ignored. */
function slug(value: string | null) {
  return value && /^[a-z0-9-]{1,64}$/i.test(value) ? value.toLowerCase() : null;
}

export const Route = createFileRoute("/api/public/events-feed.ics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { clientIp, checkRateLimit, rateLimitResponse } = await import(
          "@/lib/rate-limit.server"
        );
        const verdict = await checkRateLimit("events-feed", clientIp(request), [
          { windowSeconds: 60, max: 30 },
          { windowSeconds: 3600, max: 300 },
        ]);
        if (!verdict.allowed) return rateLimitResponse(verdict, "Too many requests");

        const params = new URL(request.url).searchParams;
        const lang = slug(params.get("lang"));
        const { buildEventsFeedIcs } = await import("@/lib/events-feed.server");
        const ics = await buildEventsFeedIcs(
          {
            community: slug(params.get("community")),
            category: slug(params.get("category")),
            region: slug(params.get("region")),
            lang: isLocale(lang) ? lang : null,
          },
          "The Switzerland Chapter of ICF — Events",
        );
        if (!ics) return new Response("Unavailable", { status: 503 });

        return new Response(ics, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="icf-switzerland-events.ics"',
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
