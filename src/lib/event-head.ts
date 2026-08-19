/**
 * SEO metadata, canonical links and Event structured data for public event detail pages.
 * Exports: eventHead. Called by public event routes.
 */
import { localizePath, SITE_URL, type Locale } from "@/i18n/config";
import { makeT } from "@/i18n";
import type { PublicEvent } from "./events";

type EventLike = Pick<
  PublicEvent,
  | "title"
  | "summary"
  | "image_url"
  | "starts_at"
  | "ends_at"
  | "timezone"
  | "location_mode"
  | "venue_name"
  | "city"
  | "online_url"
>;

/** Head metadata and JSON-LD Event structured data for a public event detail page. */
export function eventHead(
  loaderData: { event: EventLike } | undefined,
  locale: Locale,
  slug: string,
) {
  const { t } = makeT(locale);
  if (!loaderData) {
    return {
      meta: [{ title: t("events.detail.notFoundTitle") }, { name: "robots", content: "noindex" }],
    };
  }
  const e = loaderData.event;
  const title = e.title ?? t("events.detail.notFoundTitle");
  const desc = e.summary || t("events.meta.description");
  const url = `${SITE_URL}${localizePath(`/events/${slug}`, locale)}`;
  const meta: Array<Record<string, string>> = [
    { title: `${title} — The Switzerland Chapter of ICF` },
    { name: "description", content: desc },
    { property: "og:title", content: title },
    { property: "og:description", content: desc },
    { property: "og:type", content: "article" },
    { property: "og:url", content: url },
    { name: "twitter:card", content: "summary_large_image" },
  ];
  if (e.image_url?.startsWith("https://")) {
    meta.push({ property: "og:image", content: e.image_url });
    meta.push({ name: "twitter:image", content: e.image_url });
  }

  const location = buildEventLocation(e, url);
  const attendanceMode =
    e.location_mode === "online"
      ? "https://schema.org/OnlineEventAttendanceMode"
      : e.location_mode === "hybrid"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    description: desc,
    startDate: e.starts_at,
    ...(e.ends_at ? { endDate: e.ends_at } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: attendanceMode,
    location,
    organizer: {
      "@type": "Organization",
      name: "The Switzerland Chapter of ICF",
      url: SITE_URL,
    },
    url,
    ...(e.image_url?.startsWith("https://") ? { image: e.image_url } : {}),
  };

  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  };
}

function buildEventLocation(
  event: EventLike,
  fallbackUrl: string,
): Record<string, unknown> | undefined {
  if (event.location_mode === "online") {
    return {
      "@type": "VirtualLocation",
      url: event.online_url || fallbackUrl,
    };
  }
  const place: Record<string, unknown> = { "@type": "Place" };
  if (event.venue_name) place.name = event.venue_name;
  if (event.city) place.address = { "@type": "PostalAddress", addressLocality: event.city };
  if (event.location_mode === "hybrid") {
    return {
      "@type": "Place",
      name: event.venue_name || "Hybrid venue",
      address: event.city ? { "@type": "PostalAddress", addressLocality: event.city } : undefined,
    };
  }
  return Object.keys(place).length > 1 ? place : undefined;
}
