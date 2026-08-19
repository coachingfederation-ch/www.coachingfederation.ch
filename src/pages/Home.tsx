/**
 * Main landing page of the site featuring hero, audiences, pillars, and events overview.
 * Exports: HomePage (default). Rendered by src/routes/index.tsx and the
 * locale-prefixed equivalent in src/routes/$locale/index.tsx.
 */
import adSupervision from "@/assets/ads/ad-supervision.jpg";
import adPress from "@/assets/ads/ad-press.jpg";
import adAssessment from "@/assets/ads/ad-assessment.jpg";
import adPractice from "@/assets/ads/ad-practice.jpg";
import adRetreats from "@/assets/ads/ad-retreats.jpg";
import adMentoring from "@/assets/ads/ad-mentoring.jpg";
import heroImg from "@/assets/hero-coaching.jpg";
import leadershipImg from "@/assets/leadership-team.jpg";
import { BrushMark as Mark } from "@/design-system/icf-welcome-design-system-a835df/components/brush/BrushMark";
import type { MarkName } from "@/design-system/icf-welcome-design-system-a835df/components/brush/marks";
// Imported from the component module rather than the library index: the index
// also re-exports the library's own showcase chrome, whose links point at
// routes that only exist in the design-system project.
import { AiBadge } from "@/design-system/icf-welcome-design-system-a835df/components/photography/AiPhoto";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { SiteHeaderBar, SiteFooter, CARD_SHADOW } from "@/components/site-chrome";
import { SponsorMarquee, type SponsorItem } from "@/components/home/SponsorMarquee";
import { useI18n, LocaleLink } from "@/i18n";

/** Demo sponsor imagery (AI generated), ordered to match `home.ads.items`. */
const AD_IMAGES = [adSupervision, adPress, adAssessment, adPractice, adRetreats, adMentoring];

function HeroHeader() {
  const { t } = useI18n();
  return (
    <header className="bg-hero text-hero-foreground">
      <div className="mx-auto max-w-7xl px-5 pt-6 pb-16 sm:px-8">
        <div className="mb-10">
          <SiteHeaderBar />
        </div>

        <div className="grid gap-12 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-16">
          <div className="max-w-2xl">
            <p className="eyebrow !text-accent">{t("home.hero.eyebrow")}</p>
            <h1 className="display-xl mt-4">
              {t("home.hero.titlePre")}
              <span className="text-accent">{t("home.hero.titleAccent")}</span>
              {t("home.hero.titlePost")}
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-[1.65] text-hero-foreground/85">
              {t("home.hero.subtitle")}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild variant="pill" size="pill">
                <LocaleLink to="/find-a-coach">{t("common.nav.findACoach")} →</LocaleLink>
              </Button>
              <LocaleLink
                to="/for-organisations"
                className="inline-flex h-12 items-center text-sm font-semibold text-hero-foreground/85 underline-offset-4 transition hover:text-hero-foreground hover:underline"
              >
                {t("common.nav.forOrganisations")}
              </LocaleLink>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt={t("home.hero.imgAlt")}
              width={1440}
              height={1152}
              className="aspect-[5/4] w-full rounded-4xl object-cover"
            />
            {/* The hero photograph is AI generated: the disclosure travels with
                the image and sits clear of the faces. */}
            <AiBadge label={t("common.aiGenerated")} className="absolute bottom-4 left-4" />
            <Mark
              name="Asterisk01"
              className="pointer-events-none absolute -right-4 -top-7 h-24 w-24 text-mark-yellow sm:-right-6 sm:-top-9 sm:h-28 sm:w-28"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function Audiences() {
  const { tList } = useI18n();
  const audiences = tList<{ eyebrow: string; title: string; desc: string; cta: string }>(
    "home.audiences",
  );
  const targets = [
    "/find-a-coach",
    "/for-organisations",
    "/for-coaches",
    "https://coachingfederation.org/become-a-coach/why-become-a-coach/",
  ];
  const isExternal = [false, false, false, true];
  const cardClassName = "group flex flex-col bg-card p-7 transition-colors hover:bg-secondary/50";
  return (
    <section id="find-a-coach" className="mx-auto -mt-10 max-w-7xl px-5 sm:px-8">
      <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        {audiences.map((a, i) => {
          const children = (
            <>
              <p className="section-label">{a.eyebrow}</p>
              <h3 className="mt-3 text-xl font-semibold text-foreground">{a.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-[1.65] text-muted-foreground">{a.desc}</p>
              <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {a.cta}
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </>
          );
          if (isExternal[i]) {
            return (
              <a
                key={a.title + a.eyebrow}
                href={targets[i]}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClassName}
              >
                {children}
              </a>
            );
          }
          return (
            <LocaleLink
              key={a.title + a.eyebrow}
              to={targets[i] ?? "/about"}
              className={cardClassName}
            >
              {children}
            </LocaleLink>
          );
        })}
      </div>
    </section>
  );
}

function WhyCredentialed() {
  const { t, tList } = useI18n();
  const pillars = tList<{ title: string; desc: string }>("home.pillars.items");
  return (
    <section className="relative mt-20 overflow-hidden bg-card py-24">
      <Mark
        name="CircularMark01"
        className="pointer-events-none absolute -right-20 top-10 h-64 w-64 text-mark-blue opacity-10"
      />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <p className="eyebrow">{t("home.pillars.eyebrow")}</p>
        <div className="mt-5 grid gap-10 md:grid-cols-2 md:items-end">
          <h2 className="display-lg text-foreground">{t("home.pillars.title")}</h2>
          <p className="text-[17px] leading-[1.7] text-muted-foreground">
            {t("home.pillars.subtitle")}
          </p>
        </div>
        <div className="mt-16 grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <div key={p.title} className="relative border-t border-border pt-6">
              <span
                aria-hidden="true"
                className="block font-display text-5xl font-bold leading-none tracking-tight text-primary/15"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-3 text-sm leading-[1.7] text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const THEME_STYLES: { bg: string; fg: string; mark: MarkName }[] = [
  { bg: "bg-card", fg: "text-mark-indigo", mark: "CircularMark01" },
  { bg: "bg-card", fg: "text-mark-blue", mark: "Star01" },
  { bg: "bg-mark-yellow", fg: "text-mark-indigo", mark: "Asterisk01" },
  { bg: "bg-mark-indigo", fg: "text-mark-cream", mark: "CircularMark02" },
];

function CoachingInAction() {
  const { t, tList } = useI18n();
  const themes = tList<{ tag: string; title: string }>("home.insights.themes").map((item, i) => ({
    ...item,
    ...THEME_STYLES[i],
  }));
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{t("home.insights.eyebrow")}</p>
            <h2 className="display-lg mt-4 max-w-2xl text-foreground">
              {t("home.insights.title")}
            </h2>
          </div>
          <LocaleLink
            to="/insights"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("home.insights.cta")}
          </LocaleLink>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {themes.map((th) => (
            <LocaleLink
              key={th.tag}
              to="/insights"
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-chip-active-border"
            >
              <div className={"grid aspect-[4/3] w-full place-items-center " + th.bg + " " + th.fg}>
                <Mark name={th.mark} className="h-2/5 w-2/5 opacity-90" />
              </div>
              <div className="p-6">
                <p className="section-label">{th.tag}</p>
                <h3 className="mt-2.5 text-base font-semibold leading-snug text-foreground">
                  {th.title}
                </h3>
              </div>
            </LocaleLink>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForOrganisations() {
  const { t } = useI18n();
  return (
    <section id="organisations" className="bg-card text-foreground">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 py-24 md:grid-cols-2 md:items-center">
        <div>
          <p className="eyebrow">{t("home.organisations.eyebrow")}</p>
          <h2 className="mt-3 display-lg">{t("home.organisations.title")}</h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            {t("home.organisations.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="default" size="pill">
              <LocaleLink to="/for-organisations" hash="organisation-contact">
                {t("home.organisations.talkToUs")}
              </LocaleLink>
            </Button>
            <a
              href="https://coachingfederation.org/resources/resource-library/?_topic=coaching-in-organizations&_resource_type=case-studies"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              {t("home.organisations.caseStudies")}
            </a>
          </div>
        </div>
        <div className="relative">
          <img
            src={leadershipImg}
            alt={t("home.organisations.imgAlt")}
            width={1600}
            height={1280}
            loading="lazy"
            className="aspect-[5/4] w-full rounded-2xl object-cover"
          />
          <AiBadge label={t("common.aiGenerated")} className="absolute bottom-4 left-4" />
        </div>
      </div>
    </section>
  );
}

function Sponsors() {
  const { t, tList } = useI18n();
  // Demo imagery is bundled positionally: locale item order matches AD_IMAGES.
  const items = tList<SponsorItem>("home.ads.items").map((item, i) => ({
    ...item,
    image: AD_IMAGES[i],
  }));
  return (
    <section aria-label={t("home.ads.eyebrow")} className="border-t border-border bg-card py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">{t("home.ads.eyebrow")}</p>
          <h2 className="mt-4 display-lg text-foreground">{t("home.ads.title")}</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {t("home.ads.subtitle")}
          </p>
        </div>
      </div>
      <div className="mt-12">
        <SponsorMarquee
          items={items}
          adLabel={t("home.ads.adLabel")}
          cta={t("home.ads.cta")}
          aiLabel={t("common.aiGenerated")}
        />
      </div>
    </section>
  );
}

const EVENT_STYLES: { bg: string; fg: string; mark: MarkName }[] = [
  { bg: "bg-mark-cream", fg: "text-mark-indigo", mark: "Arrow01" },
  { bg: "bg-mark-indigo", fg: "text-mark-yellow", mark: "Asterisk03" },
  { bg: "bg-mark-yellow", fg: "text-mark-indigo", mark: "Arrow02" },
];

function Events() {
  const { t, tList } = useI18n();
  const events = tList<{ date: string; city: string; title: string; tags: string[] }>(
    "home.events.items",
  ).map((item, i) => ({ ...item, ...EVENT_STYLES[i] }));
  return (
    <section className="bg-card py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{t("home.events.eyebrow")}</p>
            <h2 className="mt-3 display-lg text-foreground">{t("home.events.title")}</h2>
          </div>
          <LocaleLink to="/events" className="text-sm font-semibold text-primary hover:underline">
            {t("home.events.viewAll")}
          </LocaleLink>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {events.map((e) => (
            <LocaleLink
              key={e.title}
              to="/events"
              className={
                "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 " +
                CARD_SHADOW
              }
            >
              <div className={"grid aspect-[16/10] w-full place-items-center " + e.bg + " " + e.fg}>
                <Mark name={e.mark} className="h-3/5 w-3/5" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="btn-mono !text-muted-foreground">
                  {e.date} · {e.city}
                </p>
                <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-foreground">
                  {e.title}
                </h3>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {e.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-border bg-chip px-2.5 py-1 text-[11px] font-semibold text-chip-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </LocaleLink>
          ))}
        </div>
      </div>
    </section>
  );
}

function Research() {
  const { t, tList } = useI18n();
  const partners = tList<string>("home.research.partners");
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 text-center">
        <p className="eyebrow">{t("home.research.eyebrow")}</p>
        <h2 className="mx-auto mt-3 max-w-3xl display-lg text-foreground">
          {t("home.research.title")}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {t("home.research.subtitle")}
        </p>
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-5">
          {partners.map((p) => (
            <div
              key={p}
              className={
                "grid h-20 place-items-center rounded-2xl border border-border bg-card text-sm font-semibold text-foreground/70 " +
                CARD_SHADOW
              }
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Join() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-hero text-hero-foreground">
      <Mark
        name="CircularMark02"
        className="pointer-events-none absolute -right-16 -top-10 h-96 w-96 text-mark-cream opacity-40"
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 py-24 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="eyebrow !text-accent">{t("home.join.eyebrow")}</p>
          <h2 className="mt-3 display-lg">{t("home.join.title")}</h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-hero-foreground/85">
            {t("home.join.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://coachingfederation.org/about/icf-membership/individual-membership/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-full bg-hero-foreground px-5 text-sm font-semibold text-hero transition hover:bg-hero-foreground/90"
            >
              {t("home.join.becomeMember")}
            </a>
            <LocaleLink
              to="/for-coaches"
              hash="credentials"
              className="inline-flex h-10 items-center rounded-full border border-hero-foreground/30 px-5 text-sm font-semibold text-hero-foreground transition hover:bg-hero-foreground/10"
            >
              {t("home.join.exploreCredentials")}
            </LocaleLink>
          </div>
        </div>
        <div className="rounded-2xl border border-hero-foreground/15 bg-hero-foreground/5 p-6 backdrop-blur">
          <h3 className="text-xl font-semibold tracking-tight text-hero-foreground">{t("home.join.newsletterTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-hero-foreground/85">
            {t("home.join.newsletterSubtitle")}
          </p>
          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="home-newsletter-email" className="sr-only">
              {t("common.form.emailLabel")}
            </label>
            <input
              id="home-newsletter-email"
              name="email"
              autoComplete="email"
              type="email"
              required
              placeholder={t("home.join.emailPlaceholder")}
              className="h-10 w-full rounded-full border border-hero-foreground/20 bg-hero-foreground/10 px-4 text-sm text-hero-foreground placeholder:text-hero-foreground/70 outline-none focus:border-hero-foreground/60"
            />
            <button
              type="submit"
              className="h-10 rounded-full bg-hero-foreground px-5 text-sm font-semibold text-hero transition hover:bg-hero-foreground/90"
            >
              {t("home.join.subscribe")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <HeroHeader />
      <main id="main">
        <Audiences />
        <WhyCredentialed />
        <CoachingInAction />
        <ForOrganisations />
        <Events />
        <Sponsors />
        <Research />
        <Join />
      </main>
      <SiteFooter />
    </div>
  );
}
