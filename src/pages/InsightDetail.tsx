/**
 * Individual insight/article detail page with content, byline, and social sharing.
 * Exports: InsightDetailPage (default), DetailShell, ArticleFallback. Rendered by
 * src/routes/insights.$id.tsx and the locale-prefixed equivalent.
 */
import { Mark } from "@/components/marks";
import { HeroMarks } from "@/components/HeroMarks";
import { HERO_ARTICLE_PLACEMENT, sanitizeHeroMarks } from "@/lib/hero-design";
import { Markdown } from "@/components/markdown";
import { SiteHeaderBar, SiteFooter } from "@/components/site-chrome";
import {
  articleCategoryLabel,
  authorName,
  formatArticleDate,
  tileFor,
  type PublicArticle,
} from "@/lib/articles";
import { LocaleLink, useI18n } from "@/i18n";
import { localizePath, SITE_URL } from "@/i18n/config";
import { ShareInline, ShareBlock } from "@/components/share-buttons";
import { useTrackView } from "@/lib/plausible";

export function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="bg-hero text-hero-foreground">
        <div className="mx-auto max-w-7xl px-5 pt-6 pb-8 sm:px-8">
          <SiteHeaderBar compact />
        </div>
      </header>
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function ArticleFallback({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { t } = useI18n();
  return (
    <DetailShell>
      <div className="mx-auto max-w-3xl px-8 py-28 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t(titleKey)}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{t(bodyKey)}</p>
        <LocaleLink
          to="/insights"
          className="mt-8 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          {t("insights.detail.backCta")}
        </LocaleLink>
      </div>
    </DetailShell>
  );
}

type DetailArticle = Omit<PublicArticle, "is_featured"> & {
  content?: string | null;
  resolvedLocale?: string;
};

export default function InsightDetailPage({ article }: { article: DetailArticle }) {
  const { t, locale } = useI18n();
  useTrackView("Insight View", article.id, { article_id: article.id });
  const tile = tileFor(article.id);
  // A hand-placed cover arrangement replaces the automatic fallback mark.
  const placedMarks = sanitizeHeroMarks(
    "article",
    (article as { hero_marks?: unknown }).hero_marks,
  );
  const category = articleCategoryLabel(article as PublicArticle, locale);
  const byline = authorName(article.author) ?? t("insights.byline");
  // Canonical, locale-aware URL so readers share their own language edition.
  const shareUrl = `${SITE_URL}${localizePath(`/insights/${article.id}`, locale)}`;

  return (
    <DetailShell>
      <article className="mx-auto max-w-3xl px-8 pt-16 pb-24">
        <LocaleLink
          to="/insights"
          className="btn-mono !text-muted-foreground hover:!text-foreground"
        >
          {t("insights.detail.back")}
        </LocaleLink>
        {category ? <p className="section-label mt-6">{category}</p> : null}
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          {article.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-6">
          <div>
            <p className="text-base font-semibold text-foreground">{byline}</p>
            <p className="btn-mono mt-1 !text-muted-foreground">
              {formatArticleDate(article.published_at)}
              {category ? ` · ${category}` : ""}
            </p>
          </div>
          <ShareInline url={shareUrl} title={article.title} />
        </div>
        {article.excerpt ? (
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{article.excerpt}</p>
        ) : null}

        <div className="relative mt-10 overflow-hidden rounded-2xl border border-border/70">
          {article.featured_image_url ? (
            <img
              src={article.featured_image_url}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
          ) : (
            <div
              className={"grid aspect-[16/9] w-full place-items-center " + tile.bg + " " + tile.fg}
            >
              {placedMarks ? null : <Mark name={tile.mark} className="h-1/2 w-1/2" />}
            </div>
          )}
          {placedMarks ? (
            <HeroMarks marks={placedMarks} placement={HERO_ARTICLE_PLACEMENT} />
          ) : null}
        </div>
        {article.featured_image_url && article.image_credit_name ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Photo by{" "}
            <a
              href={article.image_credit_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {article.image_credit_name}
            </a>{" "}
            on{" "}
            <a
              href="https://unsplash.com?utm_source=icf_switzerland&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Unsplash
            </a>
          </p>
        ) : null}

        <div className="mt-10">
          <Markdown>{String(article.content ?? "")}</Markdown>
        </div>

        <ShareBlock url={shareUrl} title={article.title} />
      </article>
    </DetailShell>
  );
}
