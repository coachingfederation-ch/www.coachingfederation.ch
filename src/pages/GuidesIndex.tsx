/**
 * Public index of member guides (/guides).
 * Exports: GuidesIndexPage (default). Rendered by src/routes/guides.index.tsx
 * and the locale-prefixed equivalent.
 */
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { CompactHero, SiteFooter } from "@/components/site-chrome";
import { LocaleLink, useI18n, useLocale } from "@/i18n";
import { listGuides } from "@/lib/guides.functions";

export default function GuidesIndexPage() {
  const { t } = useI18n();
  const locale = useLocale();
  const { data, isPending } = useQuery({
    queryKey: ["guides", locale],
    queryFn: () => listGuides({ data: { locale } }),
  });
  const guides = data ?? [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("guides.hero.eyebrow")}
        title={
          <>
            {t("guides.hero.titlePre")}
            <span className="text-accent">{t("guides.hero.titleAccent")}</span>
          </>
        }
        lede={t("guides.hero.lede")}
      />

      <main id="main">
        <section className="bg-card py-14">
          <div className="mx-auto max-w-4xl px-6 sm:px-8">
            {isPending ? (
              <p className="text-sm text-muted-foreground">{t("guides.loading")}</p>
            ) : guides.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("guides.empty")}</p>
            ) : (
              <ul className="grid gap-4">
                {guides.map((guide) => (
                  <li key={guide.id}>
                    <LocaleLink
                      to={`/guides/${guide.slug}`}
                      className="group flex items-start justify-between gap-6 rounded-3xl border border-border bg-background p-6 transition hover:border-primary/40"
                    >
                      <span>
                        {guide.eyebrow ? (
                          <span className="eyebrow text-muted-foreground">{guide.eyebrow}</span>
                        ) : null}
                        <span className="mt-2 block font-heading text-xl text-foreground">
                          {guide.title}
                        </span>
                        {guide.summary ? (
                          <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                            {guide.summary}
                          </span>
                        ) : null}
                      </span>
                      <ArrowRight
                        className="mt-1 h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-1"
                        aria-hidden
                      />
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
