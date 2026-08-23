/**
 * About page showing the ICF Switzerland mission, research partners, and team/community previews.
 * Exports: AboutPage (default). Rendered by src/routes/about.tsx and the locale-prefixed
 * equivalent in src/routes/$locale/about.tsx.
 */
import { BrushMark as Mark, Button } from "@/design-system/icf-welcome-design-system-a835df";
import { CompactHero, SiteFooter, CARD_SHADOW } from "@/components/site-chrome";
import { DeibCommitment } from "@/components/about/DeibCommitment";
import { ContactForm } from "@/components/about/ContactForm";
import { Governance } from "@/components/about/Governance";
import { TeamPreview } from "@/components/team/TeamPreview";
import { CommunitiesPreview } from "@/components/communities/CommunitiesPreview";
import { useI18n } from "@/i18n";

export default function AboutPage() {
  const { t, tList } = useI18n();
  const partners = tList<string>("about.research.partners");
  const research = tList<{ title: string; desc: string }>("about.research.items");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("about.hero.eyebrow")}
        title={
          <>
            {t("about.hero.titlePrefix")}
            <span className="text-accent">{t("about.hero.titleAccent")}</span>
          </>
        }
        lede={t("about.hero.lede")}
      />
      <main id="main">
        <section className="bg-card text-foreground">
          <div className="mx-auto grid max-w-7xl gap-10 px-8 py-24 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <p className="eyebrow">{t("about.mission.eyebrow")}</p>
              <h2 className="mt-3 display-lg">{t("about.mission.title")}</h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                {t("about.mission.body")}
              </p>
              <Button asChild variant="default" size="pill" className="mt-8">
                <a
                  href="https://coachingfederation-ch-okr.lovable.app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Our Strategy
                </a>
              </Button>
            </div>
            <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-border/70 bg-background">
              <Mark name="Star01" className="h-1/2 w-1/2 text-mark-indigo" />
            </div>
          </div>
        </section>

        <DeibCommitment />

        <TeamPreview />

        <Governance />

        <CommunitiesPreview />

        <section className="bg-background py-24">
          <div className="mx-auto max-w-7xl px-8">
            <p className="eyebrow">{t("about.research.eyebrow")}</p>
            <h2 className="mt-3 max-w-2xl display-lg">{t("about.research.title")}</h2>
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5">
              {partners.map((p) => (
                <div
                  key={p}
                  className={
                    "grid h-20 place-items-center rounded-2xl border border-border/70 bg-card text-sm font-semibold text-foreground/70 " +
                    CARD_SHADOW
                  }
                >
                  {p}
                </div>
              ))}
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {research.map((r) => (
                <div
                  key={r.title}
                  className={"rounded-2xl border border-border/70 bg-card p-8 " + CARD_SHADOW}
                >
                  <h3 className="text-lg font-semibold tracking-tight">{r.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ContactForm />

        <section className="bg-hero text-hero-foreground">
          <div className="mx-auto max-w-7xl px-8 py-20 text-center">
            <p className="eyebrow !text-accent">{t("about.cta.eyebrow")}</p>
            <h2 className="mx-auto mt-3 max-w-2xl display-lg">{t("about.cta.title")}</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild variant="inverse" size="pill">
                <a
                  href="https://coachingfederation.org/about/icf-membership/individual-membership/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("about.cta.join")}
                </a>
              </Button>
              <Button asChild variant="inverse-ghost" size="pill">
                <a href="#contact">{t("about.cta.contact")}</a>
              </Button>

            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
