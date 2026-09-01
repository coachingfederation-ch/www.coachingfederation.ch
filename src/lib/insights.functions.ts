/**
 * Server functions to fetch published articles with localization support.
 * Exports: getPublishedArticle (createServerFn). Called by public insight routes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublishedArticle = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), locale: z.enum(["en", "de", "fr", "it"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { publicSupabaseClient } = await import("./supabase-public.server");
    const supabasePublic = publicSupabaseClient();
    const { data: row, error } = await supabasePublic
      .from("articles")
      .select(
        "id, title, excerpt, content, category, category_id, featured_image_url, image_source, image_credit_name, image_credit_url, hero_marks, published_at, language, category_ref:categories(id, slug, name, name_de, name_fr, name_it), author:profiles(first_name, last_name), translations:article_translations(locale, title, excerpt, content)",
      )
      .eq("id", data.id)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { translations, ...article } = row as typeof row & {
      translations?:
        | { locale: string; title: string; excerpt: string; content: string | null }[]
        | null;
    };
    const available = [article.language, ...(translations ?? []).map((tr) => tr.locale)];

    if (article.language === data.locale) {
      return { ...article, resolvedLocale: article.language, available };
    }
    const match = (translations ?? []).find((tr) => tr.locale === data.locale);
    if (!match) {
      return { ...article, resolvedLocale: article.language, available };
    }
    return {
      ...article,
      title: match.title,
      excerpt: match.excerpt,
      content: match.content ?? article.content,
      resolvedLocale: data.locale,
      available,
    };
  });
