/**
 * Europe Pulse — the weekly, multilingual feed of what other ICF chapters in
 * Europe are doing. Read-only: everything here is curated by the weekly scan
 * and simply links back to the originating chapter's own site.
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Globe2 } from "lucide-react";
import { CompactHero, SiteFooter, CARD_SHADOW } from "@/components/site-chrome";
import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n/config";
import {
  flagFor,
  formatPulseDate,
  type EuropePulseSearch,
  type PulseItem,
} from "@/lib/europe-pulse";
import { listEuropePulse } from "@/lib/europe-pulse.functions";

function TypeChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/70 bg-chip px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-chip-foreground">
      {label}
    </span>
  );
}

function PulseCard({ item }: { item: PulseItem }) {
  const { t, locale } = useI18n();
  const date = formatPulseDate(item.eventDate, locale);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "group flex flex-col rounded-2xl border border-border/70 bg-card p-6 transition hover:-translate-y-0.5 " +
        CARD_SHADOW
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden className="text-base">
            {flagFor(item.countryCode)}
          </span>
          <span className="truncate">{item.chapter}</span>
        </span>
        <TypeChip label={t(`europe-pulse.types.${item.type}`)} />
      </div>
      <h3 className="mt-4 text-base font-semibold leading-snug tracking-tight">{item.title}</h3>
      {item.description ? (
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {date ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" /> {date}
          </span>
        ) : (
          <span>{item.country}</span>
        )}
        <span className="btn-mono inline-flex items-center gap-1 !text-primary">
          {t("europe-pulse.card.source")} <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}

/** Short label for an edition chip, e.g. "27 Jul". */
function shortWeekLabel(iso: string, locale: Locale): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : `${locale}-CH`, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function EditionNav({ weeks, current }: { weeks: string[]; current: string }) {
  const { t, locale } = useI18n();
  if (weeks.length < 2) return null;
  const index = weeks.indexOf(current);
  // `weeks` is newest-first: "previous edition" is the next index.
  const older = index >= 0 && index < weeks.length - 1 ? weeks[index + 1] : null;
  const newer = index > 0 ? weeks[index - 1] : null;

  const arrowClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <nav
      aria-label={t("europe-pulse.archive.label")}
      className="mt-6 flex flex-wrap items-center gap-2"
    >
      {older ? (
        <Link
          to="."
          search={(prev: EuropePulseSearch) => ({ ...prev, week: older })}
          aria-label={t("europe-pulse.archive.previous")}
          className={arrowClass}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden className={arrowClass + " opacity-40"}>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {weeks.map((week, i) => {
        const active = week === current;
        return (
          <Link
            key={week}
            to="."
            search={(prev: EuropePulseSearch) => ({ ...prev, week: i === 0 ? "" : week })}
            aria-current={active ? "page" : undefined}
            className={
              "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
              (active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-chip text-chip-foreground hover:bg-secondary/60")
            }
          >
            {i === 0 ? t("europe-pulse.archive.current") : shortWeekLabel(week, locale)}
          </Link>
        );
      })}

      {newer ? (
        <Link
          to="."
          search={(prev: EuropePulseSearch) => ({
            ...prev,
            week: newer === weeks[0] ? "" : newer,
          })}
          aria-label={t("europe-pulse.archive.next")}
          className={arrowClass}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden className={arrowClass + " opacity-40"}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

export default function EuropePulsePage() {
  const { t, locale } = useI18n();
  const { week = "" } = useSearch({ strict: false }) as Partial<EuropePulseSearch>;
  const { data, isPending, isError } = useQuery({
    queryKey: ["europe-pulse", locale, week],
    queryFn: () => listEuropePulse({ data: { locale, week: week || undefined } }),
  });
  const items = data?.items ?? [];
  const weekLabel = formatPulseDate(data?.weekOf ?? null, locale);
  const countries = new Set(items.map((i) => i.countryCode)).size;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("europe-pulse.hero.eyebrow")}
        title={
          <>
            {t("europe-pulse.hero.titleLead")}{" "}
            <span className="text-accent">{t("europe-pulse.hero.titleAccent")}</span>{" "}
            {t("europe-pulse.hero.titleTail")}
          </>
        }
        lede={t("europe-pulse.hero.lede")}
      />
      <main id="main" className="bg-card py-16">
        <div className="mx-auto max-w-7xl px-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {weekLabel ? (
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {t("europe-pulse.meta.week").replace("{date}", weekLabel)}
              </span>
            ) : null}
            {items.length ? (
              <span className="inline-flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-primary" />
                {t("europe-pulse.meta.summary")
                  .replace("{items}", String(items.length))
                  .replace("{countries}", String(countries))}
              </span>
            ) : null}
          </div>

          {data?.weeks?.length ? <EditionNav weeks={data.weeks} current={data.weekOf!} /> : null}

          {data && !data.isCurrent ? (
            <p className="mt-4 text-xs text-muted-foreground">{t("europe-pulse.archive.note")}</p>
          ) : null}

          {isPending ? (
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={
                    "h-52 animate-pulse rounded-2xl border border-border/70 bg-secondary/60 " +
                    CARD_SHADOW
                  }
                />
              ))}
            </div>
          ) : isError ? (
            <div
              className={
                "mt-10 rounded-2xl border border-border/70 bg-card px-8 py-20 text-center " +
                CARD_SHADOW
              }
            >
              <h2 className="text-xl font-bold tracking-tight">{t("europe-pulse.error.title")}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                {t("europe-pulse.error.body")}
              </p>
            </div>
          ) : !items.length ? (
            <div
              className={
                "mt-10 rounded-2xl border border-border/70 bg-card px-8 py-20 text-center " +
                CARD_SHADOW
              }
            >
              <h2 className="text-xl font-bold tracking-tight">{t("europe-pulse.empty.title")}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                {t("europe-pulse.empty.body")}
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <PulseCard key={item.id} item={item} />
              ))}
            </div>
          )}

          <p className="mt-12 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {t("europe-pulse.disclaimer")}
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
