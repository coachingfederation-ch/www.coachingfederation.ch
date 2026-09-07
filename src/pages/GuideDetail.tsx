/**
 * Public detail view for one member guide (/guides/:slug).
 * Exports: GuideDetailPage (default). Rendered by src/routes/guides.$slug.tsx
 * and the locale-prefixed equivalent.
 *
 * Each section carries a tone (neutral / positive / caution / critical) that
 * maps onto design-system tokens, so a guideline reads at a glance as
 * encouraged, careful or not allowed without relying on colour alone — the
 * eyebrow always names the tone in words.
 */
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Info, XCircle } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { CompactHero, SiteFooter } from "@/components/site-chrome";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/design-system/icf-welcome-design-system-a835df/components/ui/accordion";
import { LocaleLink, useI18n, useLocale } from "@/i18n";
import { getGuide } from "@/lib/guides.functions";
import { CALLOUT_KIND, TONE_CARD, TONE_TEXT, type GuideCalloutKind } from "@/lib/guides";

const CALLOUT_ICON: Record<GuideCalloutKind, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: XCircle,
};

export default function GuideDetailPage({ slug }: { slug: string }) {
  const { t } = useI18n();
  const locale = useLocale();
  const { data, isPending } = useQuery({
    queryKey: ["guide", slug, locale],
    queryFn: () => getGuide({ data: { slug, locale } }),
  });

  if (isPending) {
    return (
      <div className="min-h-dvh bg-background">
        <p className="mx-auto max-w-3xl px-6 py-24 text-sm text-muted-foreground">
          {t("guides.loading")}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="font-heading text-2xl text-foreground">{t("guides.missing.title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("guides.missing.body")}</p>
          <LocaleLink
            to="/guides"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("guides.backToAll")}
          </LocaleLink>
        </div>
      </div>
    );
  }

  const guide = data;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={guide.eyebrow || t("guides.hero.eyebrow")}
        title={guide.title}
        lede={guide.summary}
      />

      <main id="main">
        <section className="bg-card py-14">
          <div className="mx-auto max-w-3xl px-6 sm:px-8">
            <LocaleLink
              to="/guides"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("guides.backToAll")}
            </LocaleLink>

            {guide.intro ? (
              <div className="mt-8">
                <Markdown>{guide.intro}</Markdown>
              </div>
            ) : null}

            <div className="mt-10 space-y-6">
              {guide.sections.map((section) => (
                <article
                  key={section.id}
                  className={`rounded-3xl border p-6 sm:p-8 ${TONE_CARD[section.tone]}`}
                >
                  {section.eyebrow ? (
                    <p className={`eyebrow ${TONE_TEXT[section.tone]}`}>{section.eyebrow}</p>
                  ) : null}
                  {section.heading ? (
                    <h2 className="mt-2 font-heading text-2xl text-foreground">
                      {section.heading}
                    </h2>
                  ) : null}
                  {section.lead ? (
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                      {section.lead}
                    </p>
                  ) : null}
                  {section.body ? (
                    <div className="mt-4">
                      <Markdown>{section.body}</Markdown>
                    </div>
                  ) : null}

                  {section.kind === "faq" && section.faq.length > 0 ? (
                    <Accordion type="single" collapsible className="mt-4">
                      {section.faq.map((item) => (
                        <AccordionItem key={item.id} value={item.id}>
                          <AccordionTrigger>{item.question}</AccordionTrigger>
                          <AccordionContent>
                            {item.answer ? <Markdown>{item.answer}</Markdown> : null}
                            {item.quote ? (
                              <p className="mt-3 border-l-2 border-accent pl-4 italic">
                                <span className="eyebrow block not-italic text-muted-foreground">
                                  {t("guides.faq.sayThis")}
                                </span>
                                {item.quote}
                              </p>
                            ) : null}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : null}

                  {section.callouts.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {section.callouts.map((callout) => {
                        const style = CALLOUT_KIND[callout.kind];
                        const Icon = CALLOUT_ICON[callout.kind];
                        return (
                          <div
                            key={callout.id}
                            className={`flex gap-3 rounded-2xl px-5 py-4 text-sm leading-relaxed ${style.surface}`}
                          >
                            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} aria-hidden />
                            <div>
                              {callout.label ? (
                                <p className="font-semibold">{callout.label}</p>
                              ) : null}
                              {callout.body ? <p>{callout.body}</p> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            {guide.contactEmail ? (
              <div className="mt-10 rounded-3xl bg-hero p-8 text-hero-foreground">
                <p className="eyebrow-inverse">{t("guides.contact.eyebrow")}</p>
                <p className="mt-3 text-base leading-relaxed">{t("guides.contact.body")}</p>
                <a
                  href={`mailto:${guide.contactEmail}`}
                  className="mt-4 inline-block font-semibold underline-offset-4 hover:underline"
                >
                  {guide.contactEmail}
                </a>
              </div>
            ) : null}

            {guide.footnote ? (
              <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
                {guide.footnote}
              </p>
            ) : null}
            {guide.versionLabel ? (
              <p className="mt-2 text-xs text-muted-foreground">{guide.versionLabel}</p>
            ) : null}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
