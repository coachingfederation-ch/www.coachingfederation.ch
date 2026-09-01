/**
 * Event translations sidebar. Exports: EventTranslationsPanel.
 * Thin adapter around LocaleTabsEditor, mirroring the article panel
 * but with title/summary/description fields (only markdown-free textareas).
 */
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { translateEvent } from "@/lib/event-translations.functions";
import { useCms } from "@/i18n/cms";
import {
  LocaleTabsEditor,
  type TranslationRowBase,
} from "@/components/cms/translations/LocaleTabsEditor";

interface EventTranslationRow extends TranslationRowBase {
  title: string;
  summary: string | null;
  description: string | null;
}
type EventTranslationValues = Pick<EventTranslationRow, "title" | "summary" | "description">;

export function EventTranslationsPanel({
  eventId,
  sourceLanguage,
  contentUpdatedAt,
}: {
  eventId: string;
  sourceLanguage: string;
  contentUpdatedAt: string | null;
}) {
  const { t } = useCms();
  const runTranslate = useServerFn(translateEvent);

  return (
    <LocaleTabsEditor<EventTranslationRow, EventTranslationValues>
      deps={[eventId]}
      adapter={{
        sourceLanguage,
        contentUpdatedAt,
        fields: [
          { key: "title", label: t("eventTranslations.titleField"), type: "input" },
          {
            key: "summary",
            label: t("eventTranslations.summaryField"),
            type: "textarea",
            rows: 3,
          },
          {
            key: "description",
            label: t("eventTranslations.descriptionField"),
            type: "rich",
            rows: 10,
          },
        ],
        load: async () => {
          const { data } = await supabase
            .from("event_translations")
            .select("locale, title, summary, description, manually_edited, source_updated_at")
            .eq("event_id", eventId);
          return (data ?? []) as EventTranslationRow[];
        },
        translate: async (locale) => {
          await runTranslate({ data: { eventId, locale } });
        },
        save: async (locale, values) => {
          const { error } = await supabase
            .from("event_translations")
            .update({
              title: values.title,
              summary: values.summary,
              description: values.description,
              manually_edited: true,
            })
            .eq("event_id", eventId)
            .eq("locale", locale);
          return { error: error?.message ?? null };
        },
        valuesFromRow: (row) => ({
          title: row.title,
          summary: row.summary,
          description: row.description,
        }),
        labels: {
          title: t("eventTranslations.title"),
          hint: t("eventTranslations.hint"),
          confirmOverwrite: t("eventTranslations.confirmOverwrite"),
          failed: t("eventTranslations.failed"),
          notTranslated: t("eventTranslations.notTranslated"),
          needsRefresh: t("eventTranslations.needsRefresh"),
          manual: t("eventTranslations.manual"),
          upToDate: t("eventTranslations.upToDate"),
          translate: t("eventTranslations.translate"),
          refresh: t("eventTranslations.refresh"),
          working: t("eventTranslations.working"),
          open: t("eventTranslations.open"),
          close: t("eventTranslations.close"),
          saveTranslation: t("eventTranslations.saveTranslation"),
          savedTranslation: t("eventTranslations.savedTranslation"),
          translateAll: t("eventTranslations.translateAll"),
          discard: t("eventTranslations.discard"),
          unsaved: t("eventTranslations.unsaved"),
          emptyState: t("eventTranslations.emptyState"),
        },
      }}
    />
  );
}
