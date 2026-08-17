/**
 * Upcoming events shown on a local community page.
 *
 * Purely presentational: the caller decides which events belong here and in
 * which order. Events that belong to a different community carry their
 * community name as a chip, so the fallback list never reads as if this
 * community were hosting them.
 */
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { CARD_SHADOW } from "@/components/site-chrome";
import { LocaleLink, useI18n } from "@/i18n";
import {
  eventPlace,
  formatEventDate,
  formatEventTimeRange,
  type PublicEvent,
} from "@/lib/events";

type CommunityEvent = PublicEvent & { resolvedLocale?: string };

/**
 * Rotating accent frames give the grid rhythm without needing any extra data:
 * the colour is derived from the card position, so it is stable across renders.
 */
const ACCENTS = ["border-t-accent", "border-t-primary", "border-t-mark-blue"] as const;

/** Short day/month badge overprinted on the cover image. */
function badgeDate(iso: string, locale: string, timezone: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function CommunityEvents({
  events,
  communitySlug,
  hasOwn,
}: {
  events: CommunityEvent[];
  communitySlug: string;
  hasOwn: boolean;
}) {
  const { t, locale } = useI18n();
  if (events.length === 0) return null;

  return (
    <section className="bg-card py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <p className="eyebrow">{t("communities.detail.events.eyebrow")}</p>
        <h2 className="mt-3 max-w-2xl display-lg">
          {hasOwn
            ? t("communities.detail.events.title")
            : t("communities.detail.events.fallbackTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {hasOwn
            ? t("communities.detail.events.lede")
            : t("communities.detail.events.fallbackLede")}
        </p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e, i) => {
            const tz = e.timezone ?? "Europe/Zurich";
            const elsewhere = e.community_slug !== communitySlug;
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <li key={e.id}>
                <LocaleLink
                  to={`/events/${e.slug}`}
                  title={`${formatEventDate(e.starts_at!, locale, tz)} · ${formatEventTimeRange(e.starts_at!, e.ends_at, locale, tz)}`}
                  className={
                    "group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border border-t-[6px] bg-background transition motion-safe:hover:-translate-y-1 " +
                    accent +
                    " " +
                    CARD_SHADOW
                  }
                >
                  <div className="p-4 pb-0">
                    <div className="relative aspect-16/10 overflow-hidden rounded-2xl bg-[color:var(--mark-indigo)]">
                      {e.image_url ? (
                        <img
                          src={e.image_url}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                        />
                      ) : (
                        <CalendarDays
                          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-[color:var(--mark-yellow)] opacity-30"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={
                          "absolute left-3 top-3 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm " +
                          (e.image_url
                            ? "bg-[color:var(--mark-indigo)] text-primary-foreground"
                            : "bg-background text-foreground")
                        }
                      >
                        {badgeDate(e.starts_at!, locale, tz)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-border/70 bg-chip px-2.5 py-1 text-[11px] font-semibold text-chip-foreground">
                        {(e.language ?? "en").toUpperCase()}
                      </span>
                      {elsewhere && e.community_name ? (
                        <span className="inline-flex items-center rounded-full border border-border/70 bg-chip px-2.5 py-1 text-[11px] font-semibold text-chip-foreground">
                          {e.community_name}
                        </span>
                      ) : null}
                      {e.is_full ? (
                        <span className="inline-flex items-center rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-semibold text-[color:var(--warn)]">
                          {t("events.tag.full")}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-xl font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                      {e.title}
                    </h3>
                    {e.summary ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {e.summary}
                      </p>
                    ) : null}

                    <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                          {t("communities.detail.events.venueLabel")}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold">
                          {eventPlace(e, t("events.tag.online"))}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                          {t("communities.detail.events.timeLabel")}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatEventTimeRange(e.starts_at!, e.ends_at, locale, tz)}
                        </p>
                      </div>
                    </div>
                  </div>
                </LocaleLink>
              </li>
            );
          })}
        </ul>

        <LocaleLink
          to="/events"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          {t("communities.detail.events.all")} <ArrowUpRight className="h-4 w-4" />
        </LocaleLink>
      </div>
    </section>
  );
}
