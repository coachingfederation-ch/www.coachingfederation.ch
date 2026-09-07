/**
 * Staff CMS for member guides (/manage/guides).
 * Exports: Route. Editors write the English source here; the translation panel
 * below the editor produces DE/FR/IT.
 *
 * Layout mirrors the operational-structure screen: a list on the left, the
 * selected record's form on the right, saving on blur so nothing is lost when
 * an editor tabs away.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { RichTextField } from "@/components/cms/RichTextField";
import { GenericTranslationsPanel } from "@/components/cms/translations/GenericTranslationsPanel";
import type { TranslationFieldConfig } from "@/components/cms/translations/types";
import { useCms } from "@/i18n/cms";
import { GUIDE_TONES } from "@/lib/guides";
import {
  createGuide,
  createGuideSection,
  deleteGuide,
  deleteGuideSection,
  getAdminGuide,
  listAdminGuides,
  updateGuide,
  updateGuideSection,
  type AdminGuideRow,
  type AdminGuideSectionRow,
} from "@/lib/guides-admin.functions";
import {
  guideTranslationFieldKeys,
  loadGuideTranslations,
  saveGuideTranslation,
  translateGuide,
  type GuideTranslationRow,
} from "@/lib/guide-translations.functions";

export const Route = createFileRoute("/_staff/manage/guides")({
  component: GuidesCmsRoute,
});

const INPUT =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30";

function GuidesCmsRoute() {
  const { t } = useCms();
  const [guides, setGuides] = useState<AdminGuideRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [guide, setGuide] = useState<AdminGuideRow | null>(null);
  const [sections, setSections] = useState<AdminGuideSectionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const loadList = async () => {
    const rows = await listAdminGuides();
    setGuides(rows);
    setSelected((current) => current ?? rows[0]?.id ?? null);
  };

  const loadOne = async (id: string) => {
    const result = await getAdminGuide({ data: { id } });
    setGuide(result?.guide ?? null);
    setSections(result?.sections ?? []);
  };

  useEffect(() => {
    void loadList();
  }, []);

  useEffect(() => {
    if (selected) void loadOne(selected);
    else {
      setGuide(null);
      setSections([]);
    }
  }, [selected]);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const patchGuide = (values: Partial<AdminGuideRow>) =>
    run(async () => {
      if (!guide) return;
      await updateGuide({ data: { id: guide.id, values } });
      await Promise.all([loadList(), loadOne(guide.id)]);
    });

  const patchSection = (id: string, values: Partial<AdminGuideSectionRow>) =>
    run(async () => {
      await updateGuideSection({ data: { id, values } });
      if (selected) await loadOne(selected);
    });

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

  const addGuide = () =>
    run(async () => {
      const title = newTitle.trim();
      if (!title) return;
      const slug = slugify(title) || `guide-${Date.now()}`;
      const { id } = await createGuide({ data: { title, slug } });
      setNewTitle("");
      await loadList();
      setSelected(id);
    });

  const sectionCount = sections.length;
  const fields: TranslationFieldConfig[] = useMemo(() => {
    const list: TranslationFieldConfig[] = [
      { key: "eyebrow", label: t("guides.fieldEyebrow"), type: "input" },
      { key: "title", label: t("guides.fieldTitle"), type: "input" },
      { key: "summary", label: t("guides.fieldSummary"), type: "textarea", rows: 3 },
      { key: "intro", label: t("guides.fieldIntro"), type: "rich" },
      { key: "footnote", label: t("guides.fieldFootnote"), type: "textarea", rows: 3 },
    ];
    sections.forEach((section, index) => {
      const prefix = `${t("guides.section")} ${index + 1}`;
      list.push(
        { key: `s${index}_eyebrow`, label: `${prefix} · ${t("guides.fieldEyebrow")}`, type: "input" },
        { key: `s${index}_heading`, label: `${prefix} · ${t("guides.fieldHeading")}`, type: "input" },
        {
          key: `s${index}_lead`,
          label: `${prefix} · ${t("guides.fieldLead")}`,
          type: "textarea",
          rows: 2,
        },
        { key: `s${index}_body`, label: `${prefix} · ${t("guides.fieldBody")}`, type: "rich" },
        {
          key: `s${index}_callout`,
          label: `${prefix} · ${t("guides.fieldCallout")}`,
          type: "textarea",
          rows: 2,
        },
      );
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionCount, t]);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-heading text-2xl text-foreground">{t("guides.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("guides.subtitle")}</p>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <nav className="space-y-1" aria-label={t("guides.title")}>
              {guides.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelected(row.id)}
                  className={
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm " +
                    (row.id === selected
                      ? "bg-secondary font-semibold text-primary"
                      : "text-muted-foreground hover:bg-secondary/60")
                  }
                >
                  <span className="truncate">{row.title || row.slug}</span>
                  {row.is_published ? null : (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide">
                      {t("guides.draft")}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="mt-4 space-y-2">
              <input
                aria-label={t("guides.newTitle")}
                placeholder={t("guides.newTitle")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => void addGuide()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> {t("guides.add")}
              </button>
            </div>
          </div>

          {guide ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-bold">{t("guides.details")}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    {t("guides.fieldTitle")}
                    <input
                      value={guide.title}
                      onChange={(e) => setGuide({ ...guide, title: e.target.value })}
                      onBlur={(e) => void patchGuide({ title: e.target.value })}
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t("guides.fieldSlug")}
                    <input
                      value={guide.slug}
                      onChange={(e) => setGuide({ ...guide, slug: e.target.value })}
                      onBlur={(e) => void patchGuide({ slug: slugify(e.target.value) })}
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t("guides.fieldEyebrow")}
                    <input
                      value={guide.eyebrow}
                      onChange={(e) => setGuide({ ...guide, eyebrow: e.target.value })}
                      onBlur={(e) => void patchGuide({ eyebrow: e.target.value })}
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t("guides.fieldVersion")}
                    <input
                      value={guide.version_label}
                      onChange={(e) => setGuide({ ...guide, version_label: e.target.value })}
                      onBlur={(e) => void patchGuide({ version_label: e.target.value })}
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t("guides.fieldContact")}
                    <input
                      type="email"
                      value={guide.contact_email ?? ""}
                      onChange={(e) => setGuide({ ...guide, contact_email: e.target.value })}
                      onBlur={(e) =>
                        void patchGuide({ contact_email: e.target.value.trim() || null })
                      }
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t("guides.fieldOrder")}
                    <input
                      type="number"
                      min={0}
                      value={guide.sort_order}
                      onChange={(e) =>
                        setGuide({ ...guide, sort_order: Number(e.target.value) || 0 })
                      }
                      onBlur={(e) => void patchGuide({ sort_order: Number(e.target.value) || 0 })}
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                </div>

                <label className="mt-3 block text-xs text-muted-foreground">
                  {t("guides.fieldSummary")}
                  <textarea
                    rows={2}
                    value={guide.summary}
                    onChange={(e) => setGuide({ ...guide, summary: e.target.value })}
                    onBlur={(e) => void patchGuide({ summary: e.target.value })}
                    className={`mt-1 ${INPUT}`}
                  />
                </label>

                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">{t("guides.fieldIntro")}</p>
                  <RichTextField
                    value={guide.intro}
                    onChange={(next) => setGuide({ ...guide, intro: next })}
                    onBlur={() => void patchGuide({ intro: guide.intro })}
                  />
                </div>

                <label className="mt-3 block text-xs text-muted-foreground">
                  {t("guides.fieldFootnote")}
                  <textarea
                    rows={2}
                    value={guide.footnote}
                    onChange={(e) => setGuide({ ...guide, footnote: e.target.value })}
                    onBlur={(e) => void patchGuide({ footnote: e.target.value })}
                    className={`mt-1 ${INPUT}`}
                  />
                </label>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={guide.is_published}
                      onChange={(e) => void patchGuide({ is_published: e.target.checked })}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    {t("guides.published")}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      void run(async () => {
                        if (!window.confirm(t("guides.confirmDelete"))) return;
                        await deleteGuide({ data: { id: guide.id } });
                        setSelected(null);
                        await loadList();
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("guides.delete")}
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-bold">{t("guides.sections")}</h2>
                <div className="mt-3 space-y-5">
                  {sections.map((section, index) => (
                    <div key={section.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {t("guides.section")} {index + 1}
                        </span>
                        <label className="text-xs text-muted-foreground">
                          {t("guides.fieldTone")}
                          <select
                            value={section.tone}
                            onChange={(e) => void patchSection(section.id, { tone: e.target.value })}
                            className={`ml-2 ${INPUT} inline-block w-auto`}
                          >
                            {GUIDE_TONES.map((tone) => (
                              <option key={tone} value={tone}>
                                {t(`guides.tone.${tone}`)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            void run(async () => {
                              await deleteGuideSection({ data: { id: section.id } });
                              if (selected) await loadOne(selected);
                            })
                          }
                          className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("guides.deleteSection")}
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-muted-foreground">
                          {t("guides.fieldEyebrow")}
                          <input
                            defaultValue={section.eyebrow}
                            onBlur={(e) =>
                              void patchSection(section.id, { eyebrow: e.target.value })
                            }
                            className={`mt-1 ${INPUT}`}
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          {t("guides.fieldHeading")}
                          <input
                            defaultValue={section.heading}
                            onBlur={(e) =>
                              void patchSection(section.id, { heading: e.target.value })
                            }
                            className={`mt-1 ${INPUT}`}
                          />
                        </label>
                      </div>
                      <label className="mt-3 block text-xs text-muted-foreground">
                        {t("guides.fieldLead")}
                        <textarea
                          rows={2}
                          defaultValue={section.lead}
                          onBlur={(e) => void patchSection(section.id, { lead: e.target.value })}
                          className={`mt-1 ${INPUT}`}
                        />
                      </label>
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground">{t("guides.fieldBody")}</p>
                        <SectionBody
                          key={`${section.id}-body`}
                          initial={section.body}
                          onCommit={(next) => void patchSection(section.id, { body: next })}
                        />
                      </div>
                      <label className="mt-3 block text-xs text-muted-foreground">
                        {t("guides.fieldCallout")}
                        <textarea
                          rows={2}
                          defaultValue={section.callout}
                          onBlur={(e) => void patchSection(section.id, { callout: e.target.value })}
                          className={`mt-1 ${INPUT}`}
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void run(async () => {
                      await createGuideSection({
                        data: { guideId: guide.id, position: sections.length },
                      });
                      await loadOne(guide.id);
                    })
                  }
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("guides.addSection")}
                </button>
              </section>

              <GenericTranslationsPanel<GuideTranslationRow, Record<string, string | null>>
                deps={[guide.id, sectionCount, guide.content_updated_at]}
                adapter={{
                  sourceLanguage: "en",
                  contentUpdatedAt: guide.content_updated_at,
                  fields,
                  load: () => loadGuideTranslations({ data: { guideId: guide.id } }),
                  translate: async (locale) => {
                    await translateGuide({
                      data: { guideId: guide.id, locale: locale as "de" | "fr" | "it" },
                    });
                  },
                  save: (locale, values) =>
                    saveGuideTranslation({
                      data: {
                        guideId: guide.id,
                        locale: locale as "de" | "fr" | "it",
                        values,
                      },
                    }),
                  valuesFromRow: (row) =>
                    Object.fromEntries(
                      guideTranslationFieldKeys(sectionCount).map((key) => [
                        key,
                        (row[key] as string | null) ?? "",
                      ]),
                    ),
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
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("guides.emptyState")}</p>
          )}
        </div>
      </div>
    </Shell>
  );
}

/**
 * Rich body editor for one section. Local state keeps the caret stable while
 * typing; the parent only hears about the text once the editor loses focus.
 */
function SectionBody({
  initial,
  onCommit,
}: {
  initial: string;
  onCommit: (next: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return <RichTextField value={value} onChange={setValue} onBlur={() => onCommit(value)} />;
}
