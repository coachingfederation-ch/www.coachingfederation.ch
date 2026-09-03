/**
 * Public events listing page with category, region, language, and format filters.
 * Exports: EventsPage (default), EventsPageData. Rendered by src/routes/events.index.tsx
 * and the locale-prefixed equivalent in src/routes/$locale/events.index.tsx.
 */
import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import { Mark, type MarkName } from "@/components/marks";
import { CompactHero, SiteFooter, CARD_SHADOW } from "@/components/site-chrome";
import { SubscribeCalendarDialog } from "@/components/events/SubscribeCalendarDialog";
import { EventProposalAgent } from "@/components/events/EventProposalAgent";

import { LocaleLink, useI18n } from "@/i18n";
import {
  eventPlace,
  formatEventDate,
  isLiveEvent,
  type EventFacetOption,
  type PublicEvent,
} from "@/lib/events";
import { useNowMinute } from "@/hooks/use-now-minute";
import type { EventsSearch } from "@/lib/events-search";

/**
 * Events carry no artwork of their own in phase 1, so each card gets a stable
 * hand-drawn mark derived from its slug — same event, same mark, every visit.
 */
const VISUALS: { bg: string; fg: string; mark: MarkName }[] = [
  { bg: "bg-mark-indigo", fg: "text-mark-yellow", mark: "asterisk3" },
  { bg: "bg-mark-yellow", fg: "text-mark-indigo", mark: "arrow2" },
  { bg: "bg-mark-blue", fg: "text-mark-cream", mark: "circular2" },
  { bg: "bg-mark-cream", fg: "text-mark-indigo", mark: "circular1" },
  { bg: "bg-mark-indigo", fg: "text-mark-cream", mark: "star" },
  { bg: "bg-mark-yellow", fg: "text-mark-indigo", mark: "asterisk1" },
];

function visualFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return VISUALS[hash % VISUALS.length];
}

const LOCATION_TAG: Record<string, string> = {
  in_person: "events.tag.inPerson",
  online: "events.tag.online",
  hybrid: "events.tag.hybrid",
};

const FORMATS = ["in_person", "online", "hybrid"] as const;
const LANGUAGES = ["de", "fr", "it", "en"] as const;

export type EventsPageData = {
  featured: PublicEvent | null;
  upcoming: PublicEvent[];
  past: PublicEvent[];
  categories: EventFacetOption[];
  regions: EventFacetOption[];
};

const selectClass =
  "h-10 w-full rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground";

function FilterSelect({
  label,
  value,
  options,
  anyLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  anyLabel: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="section-label mb-1.5 block">{label}</span>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * "Where" combines two vocabularies in one control: the region taxonomy and the
 * local communities that actually have events. Values are prefixed so a single
 * select can carry both facets without ambiguity.
 */
function WhereSelect({
  label,
  anyLabel,
  value,
  regionGroupLabel,
  communityGroupLabel,
  regions,
  communities,
  onChange,
}: {
  label: string;
  anyLabel: string;
  value: string;
  regionGroupLabel: string;
  communityGroupLabel: string;
  regions: { value: string; label: string }[];
  communities: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="section-label mb-1.5 block">{label}</span>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{anyLabel}</option>
        <optgroup label={regionGroupLabel}>
          {regions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
        {communities.length > 0 ? (
          <optgroup label={communityGroupLabel}>
            {communities.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </label>
  );
}

export default function EventsPage({ data }: { data: EventsPageData }) {
  const { t, locale } = useI18n();
  const now = useNowMinute();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as EventsSearch;
  const { featured, upcoming, past, categories, regions } = data;

  const when = search.when === "past" ? "past" : "upcoming";
  const category = search.category ?? "";
  const region = search.region ?? "";
  const community = search.community ?? "";
  const lang = search.lang ?? "";
  const format = search.format ?? "";
  const audience =
    search.audience === "members" || search.audience === "open" ? search.audience : "";
  const hasFacetFilters = Boolean(category || region || community || lang || format || audience);

  // Communities are derived from the rows on the page: a community with nothing
  // to show never appears in the filter.
  const communityOptions = (() => {
    const seen = new Map<string, string>();
    for (const e of [...(featured ? [featured] : []), ...upcoming, ...past]) {
      if (e.community_slug && e.community_name && !seen.has(e.community_slug)) {
        seen.set(e.community_slug, e.community_name);
      }
    }
    return [...seen.entries()]
      .map(([slug, name]) => ({ value: `community:${slug}`, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  })();

  const setFilter = (key: keyof EventsSearch, value: string) => {
    void navigate({
      // Empty means "any", and an empty facet is dropped so the URL stays clean.
      search: ((prev: Record<string, unknown>) => ({
        ...prev,
        [key]: value || undefined,
      })) as never,
      replace: true,
    });
  };

  /** One control, two facets: writing one always clears the other. */
  const whereValue = community ? `community:${community}` : region ? `region:${region}` : "";
  const setWhere = (next: string) => {
    const isCommunity = next.startsWith("community:");
    const slug = next.slice(next.indexOf(":") + 1);
    void navigate({
      search: ((prev: Record<string, unknown>) => ({
        ...prev,
        region: !next || isCommunity ? undefined : slug,
        community: next && isCommunity ? slug : undefined,
      })) as never,
      replace: true,
    });
  };
  const resetFilters = () =>
    void navigate({
      search: ((prev: Record<string, unknown>) => ({ when: prev["when"] })) as never,
      replace: true,
    });

  const activeFilterCount = [category, region, community, lang, format, audience].filter(
    Boolean,
  ).length;
  const [filtersOpen, setFiltersOpen] = useState(false);

  /** One set of facet controls, rendered inline on desktop and in the sheet on mobile. */
  const facetFields = (
    <>
      <FilterSelect
        label={t("events.filters.category")}
        anyLabel={t("events.filters.allCategories")}
        value={category}
        options={categories.map((c) => ({ value: c.slug, label: c.label }))}
        onChange={(v) => setFilter("category", v)}
      />
      <WhereSelect
        label={t("events.filters.where")}
        anyLabel={t("events.filters.allWhere")}
        value={whereValue}
        regionGroupLabel={t("events.filters.groupRegions")}
        communityGroupLabel={t("events.filters.groupCommunities")}
        regions={regions.map((r) => ({ value: `region:${r.slug}`, label: r.label }))}
        communities={communityOptions}
        onChange={setWhere}
      />
      <FilterSelect
        label={t("events.filters.language")}
        anyLabel={t("events.filters.allLanguages")}
        value={lang}
        options={LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() }))}
        onChange={(v) => setFilter("lang", v)}
      />
      <FilterSelect
        label={t("events.filters.audience")}
        anyLabel={t("events.filters.allAudiences")}
        value={audience}
        options={[
          { value: "open", label: t("events.filters.audienceOpen") },
          { value: "members", label: t("events.filters.audienceMembers") },
        ]}
        onChange={(v) => setFilter("audience", v)}
      />
      <FilterSelect
        label={t("events.filters.format")}
        anyLabel={t("events.filters.allFormats")}
        value={format}
        options={FORMATS.map((f) => ({ value: f, label: t(LOCATION_TAG[f]) }))}
        onChange={(v) => setFilter("format", v)}
      />
    </>
  );

  const matches = (e: PublicEvent) =>
    (!category || e.category_slug === category) &&
    (!region || e.region_slug === region) &&
    (!community || e.community_slug === community) &&
    (!lang || (e.language ?? "en") === lang) &&
    (!format || (e.location_mode ?? "in_person") === format) &&
    (!audience || (audience === "members" ? e.is_internal === true : e.is_internal !== true));

  // The featured card is a curated hero, so it only survives an unfiltered
  // upcoming view; otherwise it joins the grid like any other match.
  const showFeaturedCard = when === "upcoming" && !hasFacetFilters && Boolean(featured);
  const pool =
    when === "past" ? past : featured && !showFeaturedCard ? [featured, ...upcoming] : upcoming;
  const results = pool.filter(matches);

  const categoryLabel = (slug: string | null) =>
    categories.find((c) => c.slug === slug)?.label ?? null;

  const tagsFor = (e: PublicEvent) => [
    (e.language ?? "en").toUpperCase(),
    t(LOCATION_TAG[e.location_mode ?? "in_person"]),
    ...(e.registration_mode && e.registration_mode !== "none"
      ? [t("events.tag.registration")]
      : []),
  ];
  const dateLine = (e: PublicEvent) =>
    `${formatEventDate(e.starts_at!, locale, e.timezone ?? "Europe/Zurich")} · ${eventPlace(e, t("events.tag.online"))}`;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("events.hero.eyebrow")}
        title={
          <>
            {t("events.hero.titlePrefix")}
            <span className="text-accent">{t("events.hero.titleAccent")}</span>
            {t("events.hero.titleSuffix")}
          </>
        }
        lede={t("events.hero.lede")}
        actions={
          <SubscribeCalendarDialog
            filters={{
              ...(community ? { community } : {}),
              ...(category ? { category } : {}),
              ...(region ? { region } : {}),
              ...(lang ? { lang } : {}),
            }}
            triggerVariant="inverse-ghost"
            triggerSize="pill"
          />
        }
      />
      <main id="main">
        <section className="bg-background py-10">
          <div className="mx-auto max-w-7xl px-8">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <span className="section-label mb-1.5 block">{t("events.filters.when")}</span>
                <div
                  className="inline-flex rounded-full border border-border bg-card p-1"
                  role="group"
                  aria-label={t("events.filters.when")}
                >
                  {(["upcoming", "past"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={when === v}
                      onClick={() => setFilter("when", v === "upcoming" ? "" : v)}
                      className={
                        "h-10 rounded-full px-4 text-sm font-semibold transition sm:h-8 " +
                        (when === v
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground")
                      }
                    >
                      {t(`events.filters.${v}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile: the five facets live in a bottom sheet so the list stays
                  visible; desktop keeps the inline grid. */}
              <div className="lg:hidden">
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="pill" className="min-h-11">
                      <SlidersHorizontal aria-hidden />
                      {t("events.filters.mobileTrigger")}
                      {activeFilterCount > 0 ? (
                        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-dvh overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>{t("events.filters.mobileTitle")}</SheetTitle>
                    </SheetHeader>
                    <div className="grid gap-4 py-4 sm:grid-cols-2">{facetFields}</div>
                    <SheetFooter className="flex-row gap-3">
                      {hasFacetFilters ? (
                        <Button variant="outline" size="pill" onClick={resetFilters}>
                          {t("events.filters.reset")}
                        </Button>
                      ) : null}
                      <Button size="pill" onClick={() => setFiltersOpen(false)}>
                        {t("events.filters.apply")}
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="hidden flex-1 gap-3 lg:grid lg:grid-cols-5">{facetFields}</div>
            </div>
            {hasFacetFilters ? (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-11 text-sm font-semibold text-primary hover:underline"
                >
                  {t("events.filters.reset")}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {showFeaturedCard && featured ? (
          <section className="bg-background pb-12">
            <div className="mx-auto max-w-7xl px-8">
              <p className="eyebrow">{t("events.featured.eyebrow")}</p>
              <LocaleLink
                to={`/events/${featured.slug}`}
                className={
                  "group mt-6 grid overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:-translate-y-0.5 md:grid-cols-2 " +
                  CARD_SHADOW
                }
              >
                <div
                  className={
                    "relative grid aspect-[4/3] w-full place-items-center overflow-hidden md:aspect-auto " +
                    visualFor(featured.slug ?? "").bg +
                    " " +
                    visualFor(featured.slug ?? "").fg
                  }
                >
                  {featured.image_url ? (
                    <img
                      src={featured.image_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Mark name={visualFor(featured.slug ?? "").mark} className="h-1/2 w-1/2" />
                  )}
                </div>
                <div className="flex flex-col justify-center p-10">
                  <p className="btn-mono !text-muted-foreground">{dateLine(featured)}</p>
                  {categoryLabel(featured.category_slug) ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary">
                      {categoryLabel(featured.category_slug)}
                    </p>
                  ) : null}
                  <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                    {featured.title}
                  </h2>
                  {featured.summary ? (
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                      {featured.summary}
                    </p>
                  ) : null}
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    {tagsFor(featured).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-border/70 bg-chip px-2.5 py-1 text-xs font-semibold text-chip-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {now !== null && isLiveEvent(featured.starts_at, featured.ends_at, now) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-warn-foreground" />
                        {t("events.tag.live")}
                      </span>
                    ) : null}
                    {featured.is_internal ? (
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                        {t("events.tag.membersOnly")}
                      </span>
                    ) : null}
                    {featured.is_full ? (
                      <span className="inline-flex items-center rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn-foreground">
                        {t("events.tag.full")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </LocaleLink>
            </div>
          </section>
        ) : null}

        <section className="bg-card py-24">
          <div className="mx-auto max-w-7xl px-8">
            <p className="eyebrow">
              {when === "past" ? t("events.past.eyebrow") : t("events.upcoming.eyebrow")}
            </p>
            <h2 className="mt-3 max-w-2xl display-lg">
              {when === "past" ? t("events.past.title") : t("events.upcoming.title")}
            </h2>
            {results.length === 0 ? (
              <p className="mt-8 text-base text-muted-foreground">
                {hasFacetFilters
                  ? t("events.filters.noMatches")
                  : when === "past"
                    ? t("events.past.empty")
                    : t("events.upcoming.empty")}
              </p>
            ) : (
              <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.map((e) => {
                  const v = visualFor(e.slug ?? "");
                  return (
                    <LocaleLink
                      key={e.id}
                      to={`/events/${e.slug}`}
                      className={
                        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 " +
                        CARD_SHADOW
                      }
                    >
                      <div
                        className={
                          "relative h-44 w-full shrink-0 overflow-hidden grid place-items-center " +
                          v.bg +
                          " " +
                          v.fg
                        }
                      >
                        {e.image_url ? (
                          <img
                            src={e.image_url}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Mark name={v.mark} className="h-3/5 w-3/5" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <p className="btn-mono !text-muted-foreground">{dateLine(e)}</p>
                        {categoryLabel(e.category_slug) ? (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary">
                            {categoryLabel(e.category_slug)}
                          </p>
                        ) : null}
                        <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight">
                          {e.title}
                        </h3>
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                          {tagsFor(e).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full border border-border/70 bg-chip px-2.5 py-1 text-xs font-semibold text-chip-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                          {now !== null && isLiveEvent(e.starts_at, e.ends_at, now) ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-warn-foreground" />
                              {t("events.tag.live")}
                            </span>
                          ) : null}
                          {e.is_internal ? (
                            <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                              {t("events.tag.membersOnly")}
                            </span>
                          ) : null}
                          {e.is_full ? (
                            <span className="inline-flex items-center rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn-foreground">
                              {t("events.tag.full")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </LocaleLink>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="bg-hero text-hero-foreground">
          <div className="mx-auto max-w-7xl px-8 py-20 text-center">
            <p className="eyebrow-accent">{t("events.cta.eyebrow")}</p>
            <h2 className="mx-auto mt-3 max-w-2xl display-lg">{t("events.cta.title")}</h2>
            {/* The proposal is shaped in conversation. */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <EventProposalAgent />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
