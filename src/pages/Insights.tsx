/**
 * Blog/Insights listing page with topic filtering and featured article section.
 * Exports: InsightsPage (default). Rendered by src/routes/insights.index.tsx and
 * the locale-prefixed equivalent in src/routes/$locale/insights.index.tsx.
 */
import { Link } from "@tanstack/react-router";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Mark } from "@/components/marks";
import { CompactHero, SiteFooter, CARD_SHADOW } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { LocaleLink, useI18n } from "@/i18n";
import {
  PUBLIC_ARTICLE_COLUMNS,
  articleCategoryLabel,
  authorName,
  categoryLabel,
  formatArticleDate,
  localizeArticles,
  tileFor,
  type CategoryRow,
  type PublicArticle,
} from "@/lib/articles";
import type { Locale } from "@/i18n/config";

async function fetchPublishedArticles(locale: Locale): Promise<PublicArticle[]> {
  const { data, error } = await supabase
    .from("articles")
    .select(PUBLIC_ARTICLE_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return localizeArticles((data ?? []) as unknown as PublicArticle[], locale);
}

async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, name_de, name_fr, name_it, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

function CardVisual({ article, className }: { article: PublicArticle; className: string }) {
  if (article.featured_image_url) {
    return (
      <div className="relative">
        <img
          src={article.featured_image_url}
          alt=""
          loading="lazy"
          className={"w-full object-cover " + className}
        />
        {article.image_source === "ai" ? (
          <AiBadge className="absolute bottom-2 left-2" />
        ) : null}
      </div>
    );
  }
  const tile = tileFor(article.id);
  return (
    <div className={"grid w-full place-items-center " + tile.bg + " " + tile.fg + " " + className}>
      <Mark name={tile.mark} className="h-1/2 w-1/2" />
    </div>
  );
}

function SkeletonGrid({ recentLabel }: { recentLabel: string }) {
  return (
    <>
      <section className="mx-auto max-w-7xl px-8 py-16">
        <div
          className={
            "grid overflow-hidden rounded-2xl border border-border/70 bg-card md:grid-cols-2 " +
            CARD_SHADOW
          }
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-secondary md:aspect-auto" />
          <div className="flex flex-col justify-center gap-4 p-10">
            <div className="h-3 w-28 animate-pulse rounded-full bg-secondary" />
            <div className="h-7 w-4/5 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-full animate-pulse rounded bg-secondary" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-8 pb-24">
        <p className="eyebrow">{recentLabel}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={
                "flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card " +
                CARD_SHADOW
              }
            >
              <div className="aspect-[16/10] w-full animate-pulse bg-secondary" />
              <div className="flex flex-1 flex-col gap-3 p-6">
                <div className="h-3 w-20 animate-pulse rounded-full bg-secondary" />
                <div className="h-5 w-4/5 animate-pulse rounded bg-secondary" />
                <div className="h-4 w-full animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-8 py-16">
      <div
        className={
          "rounded-2xl border border-border/70 bg-card px-8 py-20 text-center " + CARD_SHADOW
        }
      >
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        {children}
      </div>
    </section>
  );
}

export default function InsightsPage() {
  const { t, locale } = useI18n();
  const [topic, setTopic] = useState<string>("all");
  const { data, isPending, isError } = useQuery({
    queryKey: ["published-articles", locale],
    queryFn: () => fetchPublishedArticles(locale),
  });
  const { data: categoryData } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const categories = categoryData ?? [];

  const all = data ?? [];
  const visible = topic === "all" ? all : all.filter((a) => a.category_id === topic);
  const featured = visible.find((a) => a.is_featured) ?? visible[0];
  const rest = featured ? visible.filter((a) => a.id !== featured.id) : [];
  const topics = [
    { id: "all", label: t("insights.filters.all") },
    ...categories.map((c) => ({ id: c.id, label: categoryLabel(c, locale) })),
  ];
  const cardCategory = (a: PublicArticle) => articleCategoryLabel(a, locale);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("insights.hero.eyebrow")}
        title={
          <>
            {t("insights.hero.titleLead")}{" "}
            <span className="text-accent">{t("insights.hero.titleAccent")}</span>{" "}
            {t("insights.hero.titleTail")}
          </>
        }
        lede={t("insights.hero.lede")}
      />
      <main id="main">
        <section className="mx-auto max-w-7xl px-8 pt-16">
          <div className="flex flex-wrap items-center gap-2">
            {topics.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === topic}
                onClick={() => setTopic(id)}
                className={
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-[11px] font-semibold uppercase tracking-wider transition sm:min-h-8 " +
                  (id === topic
                    ? "border-chip-active-border bg-primary text-primary-foreground"
                    : "border-border/70 bg-chip text-chip-foreground hover:border-chip-active-border")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {isPending ? (
          <SkeletonGrid recentLabel={t("insights.recent")} />
        ) : isError ? (
          <EmptyState title={t("insights.error.title")} body={t("insights.error.body")} />
        ) : !featured ? (
          <EmptyState
            title={topic === "all" ? t("insights.empty.title") : t("insights.empty.topicTitle")}
            body={topic === "all" ? t("insights.empty.body") : t("insights.empty.topicBody")}
          >
            {topic === "all" && locale !== "en" ? (
              <Link
                to="/insights"
                className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                {t("insights.empty.otherLanguage")}
              </Link>
            ) : null}
          </EmptyState>
        ) : (
          <>
            <section className="mx-auto max-w-7xl px-8 py-16">
              <LocaleLink
                to={`/insights/${featured.id}`}
                className={
                  "group grid overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:-translate-y-0.5 md:grid-cols-2 " +
                  CARD_SHADOW
                }
              >
                <CardVisual article={featured} className="aspect-[4/3] md:aspect-auto md:h-full" />
                <div className="flex flex-col justify-center p-10">
                  <p className="section-label">
                    {t("insights.featured")}
                    {cardCategory(featured) ? ` · ${cardCategory(featured)}` : ""}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    {featured.excerpt}
                  </p>
                  <p className="btn-mono mt-6 !text-muted-foreground">
                    {formatArticleDate(featured.published_at)} ·{" "}
                    {authorName(featured.author) ?? t("insights.byline")}
                  </p>
                </div>
              </LocaleLink>
            </section>

            <section className="bg-card py-24">
              <div className="mx-auto max-w-7xl px-8">
                <p className="eyebrow">{t("insights.recent")}</p>
                {rest.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">{t("insights.noneInTopic")}</p>
                ) : (
                  <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {rest.map((p) => (
                      <LocaleLink
                        key={p.id}
                        to={`/insights/${p.id}`}
                        className={
                          "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 " +
                          CARD_SHADOW
                        }
                      >
                        <CardVisual article={p} className="aspect-[16/10]" />
                        <div className="flex flex-1 flex-col p-6">
                          {cardCategory(p) ? (
                            <p className="section-label">{cardCategory(p)}</p>
                          ) : null}
                          <h3 className="mt-2 text-base font-semibold leading-snug tracking-tight">
                            {p.title}
                          </h3>
                          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                            {p.excerpt}
                          </p>
                          <p className="btn-mono mt-4 !text-muted-foreground">
                            {formatArticleDate(p.published_at)}
                          </p>
                        </div>
                      </LocaleLink>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Cross-link to the sibling weekly feed of other European chapters. */}
        <section className="bg-background py-24">
          <div className="mx-auto max-w-7xl px-8">
            <div
              className={
                "flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-8 sm:flex-row sm:items-center sm:justify-between " +
                CARD_SHADOW
              }
            >
              <div>
                <p className="eyebrow">{t("europe-pulse.preview.eyebrow")}</p>
                <h2 className="mt-2 text-xl font-bold tracking-tight">
                  {t("europe-pulse.preview.title")}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {t("europe-pulse.preview.body")}
                </p>
              </div>
              <LocaleLink
                to="/europe-pulse"
                className="inline-flex h-10 shrink-0 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {t("europe-pulse.preview.cta")} →
              </LocaleLink>
            </div>
          </div>
        </section>

        <section className="bg-hero text-hero-foreground">
          <div className="mx-auto max-w-7xl px-8 py-20 text-center">
            <p className="eyebrow-accent">{t("insights.newsletter.eyebrow")}</p>
            <h2 className="mx-auto mt-3 max-w-2xl display-lg">{t("insights.newsletter.title")}</h2>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mx-auto mt-8 flex max-w-md flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="insights-newsletter-email" className="sr-only">
                {t("common.form.emailLabel")}
              </label>
              <input
                id="insights-newsletter-email"
                name="email"
                autoComplete="email"
                type="email"
                required
                placeholder={t("insights.newsletter.placeholder")}
                className="h-10 w-full rounded-full border border-white/20 bg-white/10 px-4 text-sm text-white placeholder:text-white/70 outline-none focus:border-white/60"
              />
              <Button type="submit" variant="inverse" size="pill">
                {t("insights.newsletter.cta")}
              </Button>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
