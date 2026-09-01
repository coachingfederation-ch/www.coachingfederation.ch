/**
 * CMS sidebar panel for managing automated and manual translations of articles.
 * Exports: TranslationsPanel. Thin adapter around LocaleTabsEditor.
 */
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { translateArticle } from "@/lib/translations.functions";
import { useCms } from "@/i18n/cms";
import {
  LocaleTabsEditor,
  type TranslationRowBase,
} from "@/components/cms/translations/LocaleTabsEditor";

interface ArticleTranslationRow extends TranslationRowBase {
  title: string;
  excerpt: string;
  content: string;
}
type ArticleTranslationValues = Pick<ArticleTranslationRow, "title" | "excerpt" | "content">;

export function TranslationsPanel({
  articleId,
  sourceLanguage,
  contentUpdatedAt,
}: {
  articleId: string;
  sourceLanguage: string;
  contentUpdatedAt: string | null;
}) {
  const { t } = useCms();
  const runTranslate = useServerFn(translateArticle);

  return (
    <LocaleTabsEditor<ArticleTranslationRow, ArticleTranslationValues>
      deps={[articleId]}
      adapter={{
        sourceLanguage,
        contentUpdatedAt,
        wrapHeaderInFlexBetween: true,
        fields: [
          { key: "title", label: t("translations.titleField"), type: "input" },
          { key: "excerpt", label: t("translations.excerptField"), type: "textarea", rows: 3 },
          { key: "content", label: t("translations.bodyField"), type: "markdown", rows: 10 },
        ],
        previewField: "content",
        load: async () => {
          const { data } = await supabase
            .from("article_translations")
            .select("locale, title, excerpt, content, manually_edited, source_updated_at")
            .eq("article_id", articleId);
          return (data ?? []) as ArticleTranslationRow[];
        },
        translate: async (locale) => {
          await runTranslate({ data: { articleId, locale } });
        },
        save: async (locale, values) => {
          const { error } = await supabase
            .from("article_translations")
            .update({
              title: values.title,
              excerpt: values.excerpt,
              content: values.content,
              manually_edited: true,
            })
            .eq("article_id", articleId)
            .eq("locale", locale);
          return { error: error?.message ?? null };
        },
        valuesFromRow: (row) => ({ title: row.title, excerpt: row.excerpt, content: row.content }),
        labels: {
          title: t("translations.title"),
          hint: t("translations.hint"),
          confirmOverwrite: t("translations.confirmOverwrite"),
          failed: t("translations.failed"),
          notTranslated: t("translations.notTranslated"),
          needsRefresh: t("translations.needsRefresh"),
          manual: t("translations.manual"),
          upToDate: t("translations.upToDate"),
          translate: t("translations.translate"),
          refresh: t("translations.refresh"),
          working: t("translations.working"),
          open: t("translations.open"),
          close: t("translations.close"),
          saveTranslation: t("translations.saveTranslation"),
          savedTranslation: t("translations.savedTranslation"),
          translateAll: t("translations.translateAll"),
          discard: t("translations.discard"),
          unsaved: t("translations.unsaved"),
          emptyState: t("translations.emptyState"),
          previewWrite: t("toolbar.write"),
          previewShow: t("toolbar.preview"),
        },
      }}
    />
  );
}
