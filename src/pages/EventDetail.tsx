/**
 * Public event detail + RSVP.
 *
 * The page renders the event; registration — tiers, member pricing, questions
 * and payment — lives in `EventRegistrationPanel`. Capacity, the registration
 * window, entitlement and price are all enforced server-side.
 */
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, Languages, MapPin, Radio, Users } from "lucide-react";
import { SiteFooter, SiteHeaderBar } from "@/components/site-chrome";
import { Mark, type MarkName } from "@/components/marks";
import { Markdown } from "@/components/markdown";
import { HeroMarks } from "@/components/HeroMarks";
import { EventHeroSurface } from "@/components/events/EventHeroSurface";
import { EventRegistrationPanel } from "@/components/events/EventRegistrationPanel";
import { AddToCalendarMenu } from "@/components/events/AddToCalendarMenu";
import { HERO_EVENT_PLACEMENT, sanitizeHeroMarks } from "@/lib/hero-design";
import { LocaleLink, useI18n } from "@/i18n";
import { useNowMinute } from "@/hooks/use-now-minute";
import { supabase } from "@/integrations/supabase/client";
import {
  eventPlace,
  formatEventDate,
  formatEventTimeRange,
  isPastEvent,
  isLiveEvent,
  type PublicEvent,
} from "@/lib/events";
import type { EventHost } from "@/lib/event-hosts";
import { eventMap } from "@/lib/event-map";
import { useTrackView } from "@/lib/plausible";
import { getMyRegistration } from "@/lib/events.functions";
import { EventRecap } from "@/components/events/EventRecap";
import type { PublicRecap } from "@/lib/event-recaps";
import { SITE_URL, localizePath } from "@/i18n/config";

/*
 * Decoration for the hero band. The marks are picked from the event slug
 * (not at random) so a given event always renders the same composition —
 * stable across re-renders, SSR and hydration.
 */
/** Only the wide highlight swashes read correctly as an underline. */
const UNDERLINE_MARKS: MarkName[] = ["highlight1", "highlight2", "highlight3"];
const CORNER_MARKS: MarkName[] = ["circular1", "circular2", "asterisk1", "asterisk3", "star2"];

const hashSlug = (slug: string) => {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
};

const heroMarks = (slug: string) => {
  const h = hashSlug(slug || "event");
  return {
    underline: UNDERLINE_MARKS[h % UNDERLINE_MARKS.length]!,
    corner: CORNER_MARKS[Math.floor(h / 7) % CORNER_MARKS.length]!,
  };
};

export function EventFallback({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="bg-hero text-hero-foreground">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <SiteHeaderBar compact />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-8 py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t(titleKey)}</h1>
        <p className="mt-4 text-base text-muted-foreground">{t(bodyKey)}</p>
        <LocaleLink
          to="/events"
          className="mt-8 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          {t("events.detail.backToEvents")}
        </LocaleLink>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function EventDetailPage({
  event,
}: {
  event: PublicEvent & { hosts?: EventHost[]; recap?: PublicRecap | null };
}) {
  const { t, locale } = useI18n();
  useTrackView("Event View", event.slug ?? event.id ?? "", {
    event_slug: event.slug ?? "",
  });
  const tz = event.timezone ?? "Europe/Zurich";
  const past = isPastEvent(event);
  const now = useNowMinute();
  const live = now !== null && isLiveEvent(event.starts_at, event.ends_at, now);
  const hosts = event.hosts ?? [];
  const marks = heroMarks(event.slug ?? event.id ?? "");
  // A hand-placed hero arrangement replaces the automatic slug-seeded marks.
  const placedMarks = sanitizeHeroMarks("event", event.hero_marks);

  // Only an approved application is public; the CC/RD units are denormalised
  // onto the event row so anonymous visitors never touch the application table.
  const ccUnits = Number(event.cce_approved_cc_hours ?? 0);
  const rdUnits = Number(event.cce_approved_rd_hours ?? 0);
  const cceUnits =
    ccUnits > 0 || rdUnits > 0
      ? t("events.detail.cceApproved")
          .replace("{cc}", String(ccUnits))
          .replace("{rd}", String(rdUnits))
      : null;
  const map = eventMap(event.map_location);

  const session = useQuery({
    queryKey: ["auth-user-id"],
    // The bearer attacher reads the *session*, so gate the protected call on the
    // same source: a user with no access token would 500 the server function.
    queryFn: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    staleTime: 5 * 60_000,
  });
  const signedIn = Boolean(session.data);

  const mine = useQuery({
    queryKey: ["my-event-registration", event.id],
    queryFn: () => getMyRegistration({ data: { eventId: event.id! } }),
    enabled: signedIn && session.isFetched,
    retry: false,
  });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="bg-hero text-hero-foreground">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <SiteHeaderBar compact />
        </div>
      </header>
      <main id="main">
        <EventHeroSurface
          title={event.title ?? ""}
          summary={event.summary}
          imageUrl={event.image_url}
          meta={[
            ...(live
              ? [{ id: "live", icon: Radio, label: t("events.tag.live") }]
              : []),
            {
              id: "date",
              icon: CalendarDays,
              label: formatEventDate(event.starts_at!, locale, tz),
            },
            {
              id: "time",
              icon: Clock,
              label: formatEventTimeRange(event.starts_at!, event.ends_at, locale, tz),
            },
            { id: "place", icon: MapPin, label: eventPlace(event, t("events.tag.online")) },
            {
              id: "language",
              icon: Languages,
              label: t(`common.languageNames.${event.language ?? "en"}`),
            },
            ...(event.capacity
              ? [
                  {
                    id: "seats",
                    icon: Users,
                    label: t("events.detail.seatsLeft").replace(
                      "{n}",
                      String(event.seats_remaining ?? 0),
                    ),
                  },
                ]
              : []),
          ]}
          pills={
            [
              event.is_internal ? t("events.tag.membersOnly") : null,
              event.category_name,
              event.region_name,
            ].filter(Boolean) as string[]
          }
          back={
            <LocaleLink
              to="/events"
              className="btn-mono !text-hero-foreground/70 hover:!text-hero-foreground"
            >
              ← {t("events.detail.backToEvents")}
            </LocaleLink>
          }
          titleUnderline={
            placedMarks ? null : (
              <Mark
                name={marks.underline}
                className="-mt-1 block h-5 w-44 text-mark-yellow md:w-64"
              />
            )
          }
          credit={
            event.image_url && event.image_credit_name ? (
              <p className="text-xs text-hero-foreground/60">
                {t("events.detail.photoCredit").replace("{name}", event.image_credit_name)}{" "}
                {event.image_credit_url ? (
                  <a
                    href={event.image_credit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    ↗
                  </a>
                ) : null}
              </p>
            ) : null
          }
        >
          {placedMarks ? (
            <HeroMarks marks={placedMarks} placement={HERO_EVENT_PLACEMENT} opacity={0.85} />
          ) : (
            <Mark
              name={marks.corner}
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 text-mark-yellow/10 md:h-72 md:w-72"
            />
          )}
        </EventHeroSurface>

        <div className="mx-auto grid max-w-5xl gap-10 px-8 py-16 lg:grid-cols-[1fr_20rem]">
          <article className="prose-icf max-w-none">
            {cceUnits ? (
              <p className="not-prose mb-6 inline-flex rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                {cceUnits}
              </p>
            ) : null}
            {event.description ? (
              <div className="text-base text-foreground/90">
                <Markdown>{event.description}</Markdown>
              </div>
            ) : (
              <p className="text-base text-muted-foreground">{event.summary}</p>
            )}
            {event.location_mode !== "in_person" && event.online_url && mine.data ? (
              <p className="mt-6 text-sm">
                <a href={event.online_url} className="font-semibold text-primary hover:underline">
                  {t("events.detail.joinLink")}
                </a>
              </p>
            ) : null}
            {hosts.length > 0 ? (
              <section className="mt-10 not-prose">
                <p className="eyebrow">{t("events.detail.hostedBy")}</p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {hosts.map((host) => (
                    <li key={host.profileId}>
                      <LocaleLink
                        to={`/coach/${host.profileId}`}
                        className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition hover:border-primary/50"
                      >
                        {host.imageUrl ? (
                          <img
                            src={host.imageUrl}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className="h-12 w-12 shrink-0 rounded-full bg-secondary"
                            aria-hidden
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {host.fullName}
                          </span>
                          {host.tagline ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {host.tagline}
                            </span>
                          ) : null}
                        </span>
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {map ? (
              <section className="mt-10 not-prose">
                <p className="eyebrow">{t("events.detail.gettingThere")}</p>
                {map.embedSrc ? (
                  <iframe
                    title={t("events.detail.mapTitle")}
                    src={map.embedSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="mt-4 h-72 w-full rounded-2xl border border-border/70"
                  />
                ) : null}
                <p className="mt-3 text-sm">
                  <a
                    href={map.linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("events.detail.openInMaps")} ↗
                  </a>
                </p>
              </section>
            ) : null}
          </article>

          <div>
            <EventRegistrationPanel event={event} />
            {/* An upcoming event can be saved to a calendar without registering. */}
            {past ? null : <AddToCalendarMenu event={event} className="mt-4" />}
          </div>
        </div>

        {/* The recap only exists once the chapter published one, which is what
            turns a finished event into an editorial page. */}
        {event.recap ? (
          <EventRecap
            recap={event.recap}
            eventId={event.id!}
            eventTitle={event.title ?? ""}
            shareUrl={`${SITE_URL}${localizePath(`/events/${event.slug ?? ""}`, locale)}`}
            signedIn={signedIn}
          />
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
