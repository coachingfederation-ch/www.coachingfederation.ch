/**
 * Types and utilities for article management, categorization, and localization.
 * Exports: ARTICLE_CATEGORIES, ArticleRow, authorName, localizeArticles, tileFor. Shared utility.
 */
import type { MarkName } from "@/components/marks";
import type { Locale } from "@/i18n/config";
import type { PlacedMark } from "./mark-placement";

export const ARTICLE_CATEGORIES = [
  "Leadership",
  "AI & Coaching",
  "Diversity",
  "Future of Work",
  "Research",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  name_de: string | null;
  name_fr: string | null;
  name_it: string | null;
  sort_order: number;
}

export interface AuthorRef {
  first_name: string | null;
  last_name: string | null;
}

export type ArticleStatus = "draft" | "review" | "scheduled" | "published" | "unpublished";
export type ArticleLang = "en" | "fr" | "de" | "it";

/** An article as the CMS editor holds it — every column the editor can touch. */
export interface ArticleRow {
  id: string;
  language: ArticleLang;
  title: string;
  excerpt: string;
  content: string;
  status: ArticleStatus;
  scheduled_at: string | null;
  published_at: string | null;
  first_published_at: string | null;
  category: string | null;
  category_id: string | null;
  author_id: string;
  /** Who created the row — the four-eye rule blocks this account from publishing it. */
  created_by: string | null;
  /** Who released the article; set by the database at publish/schedule time. */
  published_by: string | null;
  content_updated_at: string | null;
  featured_image_url: string | null;
  image_credit_name: string | null;
  image_credit_url: string | null;
  image_source: string | null;
  /** Hand-placed hero brush marks (percentage geometry), null when unset. */
  hero_marks: PlacedMark[] | null;
  is_featured: boolean;
  /** Editor's disclosure that the text was written with AI assistance. */
  ai_coedited: boolean;
  updated_at: string;
}

/** Author option in the CMS byline picker. */
export interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface TranslationRef {
  locale: string;
  title: string;
  excerpt: string;
  content?: string | null;
}

/** Natural "First Last" display used in the CMS author picker and public bylines. */
export function authorName(author: AuthorRef | null | undefined): string | null {
  if (!author) return null;
  const name = `${author.first_name ?? ""} ${author.last_name ?? ""}`.trim();
  return name.length > 0 ? name : null;
}

export function categoryLabel(category: CategoryRow, locale: Locale): string {
  if (locale === "de") return category.name_de || category.name;
  if (locale === "fr") return category.name_fr || category.name;
  if (locale === "it") return category.name_it || category.name;
  return category.name;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface PublicArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string | null;
  category_id: string | null;
  category_ref?: Pick<
    CategoryRow,
    "id" | "slug" | "name" | "name_de" | "name_fr" | "name_it"
  > | null;
  featured_image_url: string | null;
  image_credit_name?: string | null;
  image_credit_url?: string | null;
  image_source?: string | null;
  is_featured: boolean;
  ai_coedited?: boolean;
  published_at: string | null;
  language: string;
  author?: AuthorRef | null;
}

export const PUBLIC_ARTICLE_COLUMNS =
  "id, title, excerpt, category, category_id, featured_image_url, image_source, is_featured, ai_coedited, published_at, language, category_ref:categories(id, slug, name, name_de, name_fr, name_it), author:profiles!articles_author_id_fkey(first_name, last_name), translations:article_translations(locale, title, excerpt)";

/** Localized display label for an article's category, falling back to legacy text. */
export function articleCategoryLabel(article: PublicArticle, locale: Locale): string | null {
  if (article.category_ref) {
    return categoryLabel(article.category_ref as CategoryRow, locale);
  }
  return article.category;
}

type WithTranslations<T> = T & { translations?: TranslationRef[] | null };

/**
 * Returns the articles readable in `locale`: source-language articles plus any
 * article translated into that locale, with translated text overlaid.
 */
export function localizeArticles<T extends PublicArticle>(
  rows: WithTranslations<T>[],
  locale: Locale,
): T[] {
  const out: T[] = [];
  for (const row of rows) {
    const { translations, ...rest } = row;
    if (row.language === locale) {
      out.push(rest as T);
      continue;
    }
    const match = (translations ?? []).find((tr) => tr.locale === locale);
    if (!match) continue;
    out.push({ ...(rest as T), title: match.title, excerpt: match.excerpt });
  }
  return out;
}

const TILES: { bg: string; fg: string; mark: MarkName }[] = [
  { bg: "bg-mark-indigo", fg: "text-mark-cream", mark: "star" },
  { bg: "bg-mark-yellow", fg: "text-mark-indigo", mark: "asterisk1" },
  { bg: "bg-mark-cream", fg: "text-mark-indigo", mark: "circular1" },
  { bg: "bg-mark-blue", fg: "text-mark-cream", mark: "circular2" },
  { bg: "bg-mark-indigo", fg: "text-mark-yellow", mark: "asterisk3" },
  { bg: "bg-mark-cream", fg: "text-mark-indigo", mark: "arrow1" },
  { bg: "bg-mark-yellow", fg: "text-mark-indigo", mark: "arrow2" },
];

/** Deterministic decorative tile for articles without a featured image. */
export function tileFor(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return TILES[sum % TILES.length];
}

export function formatArticleDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Approximate reading time in whole minutes.
 *
 * Markdown syntax (fences, links, images, emphasis, headings) is stripped
 * first so a code- or image-heavy piece is not counted as prose. 200 wpm is
 * the usual reading speed for non-fiction; the result is never below one
 * minute so a very short piece still reads as "1 min read".
 */
export function readingMinutes(content: string | null | undefined): number {
  const text = String(content ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~|-]+/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
