/**
 * Newsletter translations panel.
 *
 * Adapter around LocaleTabsEditor: one language toggle for the whole edition,
 * with the edition title, the mail subject and every enabled block flattened
 * into one field list. English stays the source; "Translate all languages"
 * fills DE, FR and IT for review before saving.
 *
 * Exports: NewsletterTranslationsPanel. Used by /manage/newsletters/:id.
 */
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { translateNewsletter } from "@/lib/newsletter-translations.functions";
import {
  LocaleTabsEditor,
  type TranslationRowBase,
} from "@/components/cms/translations/LocaleTabsEditor";
import type { TranslationFieldConfig } from "@/components/cms/translations/types";

export interface TranslatableBlock {
  id: string;
  title: string;
  enabled: boolean;
}

interface Row extends TranslationRowBase {
  values: Record<string, string | null>;
}
type Values = Record<string, string | null>;

const titleKey = (blockId: string) => `b:${blockId}:title`;
const contentKey = (blockId: string) => `b:${blockId}:content`;

export function NewsletterTranslationsPanel({
  newsletterId,
  blocks,
  contentUpdatedAt,
}: {
  newsletterId: string;
  blocks: TranslatableBlock[];
  contentUpdatedAt: string | null;
}) {
  const { t } = useCms();
  const runTranslate = useServerFn(translateNewsletter);
  const enabled = useMemo(() => blocks.filter((b) => b.enabled), [blocks]);
  const blockIds = useMemo(() => enabled.map((b) => b.id).join(","), [enabled]);

  const fields: TranslationFieldConfig[] = [
    { key: "title", label: t("newsletterTranslations.titleField"), type: "input" },
    { key: "subject", label: t("newsletterTranslations.subjectField"), type: "input" },
    ...enabled.flatMap((block) => [
      {
        key: titleKey(block.id),
        label: `${block.title} — ${t("translations.titleField")}`,
        type: "input" as const,
      },
      {
        key: contentKey(block.id),
        label: `${block.title} — ${t("newsletterTranslations.contentField")}`,
        type: "rich" as const,
        rows: 8,
      },
    ]),
  ];

  return (
    <LocaleTabsEditor<Row, Values>
      deps={[newsletterId, blockIds]}
      adapter={{
        sourceLanguage: "en",
        contentUpdatedAt,
        fields,
        load: async () => {
          const ids = enabled.map((b) => b.id);
          const [editionRes, blockRes] = await Promise.all([
            supabase
              .from("newsletter_translations")
              .select("locale, title, subject, manually_edited, source_updated_at")
              .eq("newsletter_id", newsletterId),
            ids.length
              ? supabase
                  .from("newsletter_block_translations")
                  .select("block_id, locale, title, content")
                  .in("block_id", ids)
              : Promise.resolve({ data: [] as never[] }),
          ]);

          const editions = (editionRes.data ?? []) as {
            locale: string;
            title: string;
            subject: string;
            manually_edited: boolean;
            source_updated_at: string;
          }[];
          const blockRows = ((blockRes as { data: unknown }).data ?? []) as {
            block_id: string;
            locale: string;
            title: string;
            content: string;
          }[];

          return editions.map((row) => {
            const values: Values = { title: row.title, subject: row.subject };
            for (const b of blockRows.filter((r) => r.locale === row.locale)) {
              values[titleKey(b.block_id)] = b.title;
              values[contentKey(b.block_id)] = b.content;
            }
            return {
              locale: row.locale,
              manually_edited: row.manually_edited,
              source_updated_at: row.source_updated_at,
              values,
            };
          });
        },
        translate: async (locale) => {
          await runTranslate({ data: { id: newsletterId, locale: locale as "de" | "fr" | "it" } });
        },
        save: async (locale, values) => {
          const { error } = await supabase
            .from("newsletter_translations")
            .update({
              title: values["title"] ?? "",
              subject: values["subject"] ?? "",
              manually_edited: true,
            })
            .eq("newsletter_id", newsletterId)
            .eq("locale", locale);
          if (error) return { error: error.message };

          for (const block of enabled) {
            const { error: blockError } = await supabase
              .from("newsletter_block_translations")
              .update({
                title: values[titleKey(block.id)] ?? "",
                content: values[contentKey(block.id)] ?? "",
                manually_edited: true,
              })
              .eq("block_id", block.id)
              .eq("locale", locale);
            if (blockError) return { error: blockError.message };
          }
          return { error: null };
        },
        valuesFromRow: (row) => row.values,
        labels: {
          title: t("newsletterTranslations.title"),
          hint: t("newsletterTranslations.hint"),
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
        },
      }}
    />
  );
}
