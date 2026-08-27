/**
 * Landing page for organisations highlighting coaching outcomes and ICF differentiators.
 * Exports: ForOrganisationsPage (default). Rendered by src/routes/for-organisations.tsx
 * and the locale-prefixed equivalent in src/routes/$locale/for-organisations.tsx.
 */
import { useMemo, useState } from "react";
import { Mark, type MarkName } from "@/components/marks";
import { CompactHero, SiteFooter, CARD_SHADOW } from "@/components/site-chrome";
import { CultureSurvey } from "@/components/organisations/CultureSurvey";
import { DeckSection } from "@/components/organisations/DeckSection";
import { WhoWeServe, SEGMENT_IDS, type SegmentId } from "@/components/organisations/WhoWeServe";
import {
  Differentiators,
  EventsStrip,
  Initiatives,
  ProofBar,
} from "@/components/organisations/sections";
import { useI18n } from "@/i18n";

const programmeVisuals: { bg: string; fg: string; mark: MarkName }[] = [
  { bg: "bg-mark-cream", fg: "text-mark-indigo", mark: "circular1" },
  { bg: "bg-mark-indigo", fg: "text-mark-cream", mark: "star" },
  { bg: "bg-mark-yellow", fg: "text-mark-indigo", mark: "asterisk1" },
];

/** Index of the programme card (executive / team / cultures) surfaced first per segment. */
const segmentProgrammeLead: Record<SegmentId, number> = {
  igo: 0,
  ngo: 1,
  gov: 2,
  commercial: 0,
  societal: 1,
};

export default function ForOrganisationsPage() {
  const { t, tList } = useI18n();
  const outcomes = tList<{ stat: string; title: string; desc: string }>(
    "organisations.outcomes.items",
  );
  const steps = tList<{ n: string; title: string; desc: string }>("organisations.steps.items");
  const programmes = tList<{ tag: string; title: string }>("organisations.programmes.items");
  const segments = tList<{ label: string; route: string }>("organisations.segments.items");
  const [segment, setSegment] = useState<SegmentId | null>(null);

  const segmentIndex = segment ? SEGMENT_IDS.indexOf(segment) : -1;
  const segmentCopy = segmentIndex >= 0 ? segments[segmentIndex] : undefined;
  const contextLine = segmentCopy
    ? t("organisations.segments.context")
        .replace("{segment}", segmentCopy.label)
        .replace("{route}", segmentCopy.route)
    : undefined;

  // Reorder without dropping cards: the lead programme moves to the front, rest keep order.
  const orderedProgrammes = useMemo(() => {
    if (!segment) return programmes.map((p, i) => ({ item: p, visual: i }));
    const lead = segmentProgrammeLead[segment];
    const indices = programmes
      .map((_, i) => i)
      .sort((a, b) => (a === lead ? -1 : b === lead ? 1 : 0));
    return indices.map((i) => ({ item: programmes[i], visual: i }));
  }, [programmes, segment]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("organisations.hero.eyebrow")}
        title={
          <>
            {t("organisations.hero.titlePre")}
            <span className="text-accent">{t("organisations.hero.titleAccent")}</span>
            {t("organisations.hero.titlePost")}
          </>
        }
        lede={t("organisations.hero.lede")}
        ctaLabel={t("organisations.hero.cta")}
        ctaHref="#organisation-contact"
      />
      <main id="main">
        <ProofBar />

        <section className="mx-auto max-w-7xl px-8 py-24">
          <p className="eyebrow">{t("organisations.outcomes.eyebrow")}</p>
          <h2 className="mt-3 max-w-2xl display-lg">{t("organisations.outcomes.title")}</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {outcomes.map((o) => (
              <div
                key={o.title}
                className={"rounded-2xl border border-border/70 bg-card p-8 " + CARD_SHADOW}
              >
                <p className="text-4xl font-bold tracking-tight text-primary">{o.stat}</p>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{o.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{o.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <Differentiators />

        <DeckSection />

        <WhoWeServe selected={segment} onSelect={setSegment} />

        {/* Raised surface: the numbered "how it works" list. */}
        <section className="bg-card py-24">
          <div className="mx-auto max-w-7xl px-8">
            <p className="eyebrow">{t("organisations.steps.eyebrow")}</p>
            <h2 className="mt-3 max-w-2xl display-lg">{t("organisations.steps.title")}</h2>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n}>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 btn-mono font-bold">
                      {s.n}
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Initiatives contextLine={contextLine} />

        {/* Raised surface: programme cards. */}
        <section className="bg-card py-24">
          <div className="mx-auto max-w-7xl px-8">
            <p className="eyebrow">{t("organisations.programmes.eyebrow")}</p>
            <h2 className="mt-3 max-w-2xl display-lg">{t("organisations.programmes.title")}</h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {orderedProgrammes.map(({ item: p, visual }) => {
                const v = programmeVisuals[visual];
                return (
                  <a
                    key={p.tag}
                    // There are no programme detail pages yet, so the honest next
                    // step is an enquiry to the office with the programme prefilled.
                    href={`mailto:office@coachingfederation.ch?subject=${encodeURIComponent(
                      `${t("organisations.programmes.enquirySubject")}: ${p.tag}`,
                    )}`}
                    target="_top"
                    className={
                      "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 " +
                      CARD_SHADOW
                    }
                  >
                    <div
                      className={"grid aspect-[4/3] w-full place-items-center " + v.bg + " " + v.fg}
                    >
                      <Mark name={v.mark} className="h-1/2 w-1/2" />
                    </div>
                    <div className="p-6">
                      <p className="section-label">{p.tag}</p>
                      <h3 className="mt-2 text-base font-semibold leading-snug tracking-tight">
                        {p.title}
                      </h3>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <CultureSurvey />

        <EventsStrip />

        <section className="bg-hero text-hero-foreground">
          <div className="mx-auto max-w-7xl px-8 py-20 text-center">
            <p className="eyebrow-accent">{t("organisations.getStarted.eyebrow")}</p>
            <h2 className="mx-auto mt-3 max-w-2xl display-lg">
              {t("organisations.getStarted.title")}
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#assessment"
                className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-primary transition hover:bg-white/90"
              >
                {t("organisations.getStarted.cta1")}
              </a>
              <a
                href="https://coachingfederation.org/resources/resource-library/?_topic=coaching-in-organizations&_resource_type=case-studies"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Case studies
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
