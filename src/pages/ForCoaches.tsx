/**
 * Landing page for coaches detailing membership benefits, credentials, and volunteering.
 * Exports: ForCoachesPage (default). Rendered by src/routes/for-coaches.tsx and
 * the locale-prefixed equivalent in src/routes/$locale/for-coaches.tsx.
 */
import { BrushMark as Mark, Button } from "@/design-system/icf-welcome-design-system-a835df";
import { CompactHero, SiteFooter, CARD_SHADOW } from "@/components/site-chrome";
import {
  BenefitGrid,
  CommunityGrid,
  LearningTabs,
  MemberStories,
} from "@/components/coaches/sections";
import { useI18n, LocaleLink } from "@/i18n";

export default function ForCoachesPage() {
  const { t, tList } = useI18n();
  const credentials = tList<{ level: string; hours: string; desc: string }>(
    "coaches.credentials.items",
  );
  const deibItems = tList<string>("coaches.deib.items");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("coaches.hero.eyebrow")}
        title={
          <>
            {t("coaches.hero.titlePre")}
            <span className="text-accent">{t("coaches.hero.titleAccent")}</span>
            {t("coaches.hero.titlePost")}
          </>
        }
        lede={t("coaches.hero.lede")}
        ctaLabel={t("coaches.hero.cta")}
        ctaHref={ICF_MEMBERSHIP_URL}
      />
      <main id="main">
        <BenefitGrid />
        <LearningTabs />

        <section id="credentials" className="scroll-mt-24 bg-card py-24">
          <div className="mx-auto max-w-7xl px-8">
            <p className="eyebrow">{t("coaches.credentials.eyebrow")}</p>
            <h2 className="mt-3 max-w-2xl display-lg">{t("coaches.credentials.title")}</h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {credentials.map((c) => (
                <div
                  key={c.level}
                  className={"rounded-2xl border border-border/70 bg-card p-8 " + CARD_SHADOW}
                >
                  <p className="btn-mono !text-teal-foreground">{c.hours}</p>
                  <h3 className="mt-3 text-3xl font-bold tracking-tight text-primary">{c.level}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="default" size="pill" className="mt-8">
              <a
                href="https://coachingfederation.org/credentialing/icf-credentials-overview/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("coaches.credentials.cta")}
              </a>
            </Button>
          </div>
        </section>

        <section className="bg-background py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-8 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-mark-blue text-mark-cream">
              <Mark name="Asterisk01" className="h-1/2 w-1/2" />
            </div>
            <div>
              <p className="eyebrow">{t("coaches.deib.eyebrow")}</p>
              <h2 className="mt-3 display-lg">{t("coaches.deib.title")}</h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                {t("coaches.deib.desc")}
              </p>
              <ul className="mt-6 space-y-2">
                {deibItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://coachingfederation.org/about/social-responsibility/diversity-inclusion/deib-resources/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex text-sm font-semibold text-primary hover:underline"
              >
                {t("coaches.deib.cta")}
              </a>
            </div>
          </div>
        </section>

        <section className="bg-card py-24">
          <div className="mx-auto max-w-7xl px-8">
            <p className="eyebrow">{t("coaches.chapters.eyebrow")}</p>
            <h2 className="mt-3 max-w-2xl display-lg">{t("coaches.chapters.title")}</h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {t("coaches.chapters.desc")}
            </p>
            <CommunityGrid />
            <LocaleLink
              to="/communities"
              className="mt-8 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              {t("coaches.chapters.cta")}
            </LocaleLink>
          </div>
        </section>

        <section className="bg-background py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="eyebrow">{t("coaches.volunteer.eyebrow")}</p>
              <h2 className="mt-3 display-lg">{t("coaches.volunteer.title")}</h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
                {t("coaches.volunteer.desc")}
              </p>
              <LocaleLink
                to="/volunteering"
                className="mt-7 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {t("coaches.volunteer.cta")}
              </LocaleLink>
            </div>
            <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-mark-blue text-mark-cream">
              <Mark name="Star01" className="h-1/2 w-1/2" />
            </div>
          </div>
        </section>

        <MemberStories />

        <section className="bg-hero text-hero-foreground">
          <div className="mx-auto max-w-7xl px-8 py-20 text-center">
            <p className="eyebrow-accent">{t("coaches.join.eyebrow")}</p>
            <h2 className="mx-auto mt-3 max-w-2xl display-lg">{t("coaches.join.title")}</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="https://coachingfederation.org/about/icf-membership/individual-membership/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-primary transition hover:bg-white/90"
              >
                {t("coaches.join.cta1")}
              </a>
              <LocaleLink
                to="/for-coaches"
                hash="credentials"
                className="inline-flex h-10 items-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t("coaches.join.cta2")}
              </LocaleLink>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
