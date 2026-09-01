/**
 * Reusable language-toggle translation editor.
 *
 * Replaces the per-locale accordion list: one row of language chips picks the
 * active language, the fields below edit that language, one button translates
 * every target language from the source copy into the local draft, and a
 * Save / Discard footer commits the buffered draft. Callers supply the same
 * `adapter` shape used by the previous panel, so switching is a component swap.
 *
 * Exports: LocaleTabsEditor, TranslationRowBase, TranslationPanelAdapter,
 * TranslationPanelLabels. Used by the article, event, community and newsletter
 * editors.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Languages, Loader2 } from "lucide-react";
import { MarkdownEditor, MarkdownPreview } from "@/components/cms/MarkdownEditor";
import { LOCALE_ORDER, type Locale } from "@/i18n/config";
import type { TranslationFieldConfig } from "./types";

export interface TranslationRowBase {
  locale: string;
  manually_edited: boolean;
  source_updated_at: string;
}

export interface TranslationPanelLabels {
  title: string;
  hint: string;
  confirmOverwrite: string;
  failed: string;
  notTranslated: string;
  needsRefresh: string;
  manual: string;
  upToDate: string;
  translate: string;
  refresh: string;
  working: string;
  open: string;
  close: string;
  saveTranslation: string;
  savedTranslation: string;
  previewWrite?: string;
  previewShow?: string;
  /** "Translate to DE, FR, IT" — falls back to `translate` when absent. */
  translateAll?: string;
  discard?: string;
  unsaved?: string;
  /** Shown when the selected language has no translation row yet. */
  emptyState?: string;
}

export interface TranslationPanelAdapter<
  Row extends TranslationRowBase,
  Values extends Record<string, string | null>,
> {
  sourceLanguage: string;
  contentUpdatedAt: string | null;
  /** Kept for call-site compatibility; the tabbed editor ignores it. */
  wrapHeaderInFlexBetween?: boolean;
  fields: TranslationFieldConfig<Extract<keyof Values, string>>[];
  /** Field that gets a write/preview markdown toggle. */
  previewField?: Extract<keyof Values, string>;
  load: () => Promise<Row[]>;
  translate: (locale: string) => Promise<void>;
  save: (locale: string, values: Values) => Promise<{ error: string | null }>;
  valuesFromRow: (row: Row) => Values;
  labels: TranslationPanelLabels;
}

type Drafts<Values> = Record<string, Values>;

function sameValues<Values extends Record<string, string | null>>(a: Values, b: Values): boolean {
  return Object.keys({ ...a, ...b }).every((key) => (a[key] ?? "") === (b[key] ?? ""));
}

export function LocaleTabsEditor<
  Row extends TranslationRowBase,
  Values extends Record<string, string | null>,
>({ adapter, deps }: { adapter: TranslationPanelAdapter<Row, Values>; deps: unknown[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Drafts<Values>>({});
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [preview, setPreview] = useState(false);

  const targets = useMemo(
    () => LOCALE_ORDER.filter((l) => l !== adapter.sourceLanguage),
    [adapter.sourceLanguage],
  );

  const { load: loadRows, valuesFromRow } = adapter;

  /** Reloads rows and resets the draft for every language it returns. */
  const reload = useCallback(async () => {
    const next = await loadRows();
    setRows(next);
    setDrafts((current) => {
      const merged: Drafts<Values> = { ...current };
      for (const row of next) merged[row.locale] = valuesFromRow(row);
      return merged;
    });
    return next;
  }, [loadRows, valuesFromRow]);

  useEffect(() => {
    setDrafts({});
    setSavedNote(false);
    setError(null);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (active && targets.includes(active as Locale)) return;
    setActive(targets[0] ?? null);
  }, [active, targets]);

  const rowFor = (locale: string) => rows.find((r) => r.locale === locale);

  const stateFor = (locale: string): "missing" | "fresh" | "stale" => {
    const row = rowFor(locale);
    if (!row) return "missing";
    if (
      adapter.contentUpdatedAt &&
      new Date(row.source_updated_at) < new Date(adapter.contentUpdatedAt)
    )
      return "stale";
    return "fresh";
  };

  const badgeFor = (locale: string) => {
    const row = rowFor(locale);
    const s = stateFor(locale);
    if (s === "missing")
      return { label: adapter.labels.notTranslated, cls: "text-muted-foreground" };
    if (s === "stale")
      return { label: adapter.labels.needsRefresh, cls: "text-[color:var(--warn)]" };
    return {
      label: row?.manually_edited ? adapter.labels.manual : adapter.labels.upToDate,
      cls: row?.manually_edited ? "text-primary" : "text-teal-foreground",
    };
  };


  const dirtyLocales = useMemo(
    () =>
      Object.keys(drafts).filter((locale) => {
        const row = rowFor(locale);
        if (!row) return false;
        return !sameValues(drafts[locale] as Values, adapter.valuesFromRow(row));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drafts, rows],
  );
  const isDirty = dirtyLocales.length > 0;

  const confirmOverwrite = (locales: string[]) =>
    !locales.some((locale) => rowFor(locale)?.manually_edited) ||
    window.confirm(adapter.labels.confirmOverwrite);

  const runTranslate = async (locales: string[], busyKey: string) => {
    if (!confirmOverwrite(locales)) return;
    setError(null);
    setBusy(busyKey);
    try {
      for (const locale of locales) await adapter.translate(locale);
      await reload();
      setSavedNote(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : adapter.labels.failed);
    } finally {
      setBusy(null);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    for (const locale of dirtyLocales) {
      const { error: err } = await adapter.save(locale, drafts[locale] as Values);
      if (err) {
        setError(err);
        setSaving(false);
        return;
      }
    }
    await reload();
    setSaving(false);
    setSavedNote(true);
  };

  const discard = async () => {
    setDrafts({});
    setSavedNote(false);
    await reload();
  };

  const activeRow = active ? rowFor(active) : undefined;
  const activeDraft = active ? drafts[active] : undefined;
  const translateAllLabel =
    adapter.labels.translateAll ??
    `${adapter.labels.translate} ${targets.map((l) => l.toUpperCase()).join(", ")}`;

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Languages className="h-3.5 w-3.5" />
        {adapter.labels.title}
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="text-xs text-muted-foreground">{adapter.labels.hint}</p>

        <div className="flex flex-wrap items-center gap-2">
          {targets.map((locale) => {
            const badge = badgeFor(locale);
            const selected = active === locale;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => {
                  setActive(locale);
                  setPreview(false);
                }}
                aria-pressed={selected}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-secondary"
                }`}
              >
                {locale.toUpperCase()}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    selected ? "bg-primary-foreground/15 text-primary-foreground" : badge.cls
                  }`}
                >
                  {badge.label}
                </span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            {active ? (
              <button
                type="button"
                onClick={() => void runTranslate([active], active)}
                disabled={busy !== null || saving}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
              >
                {busy === active
                  ? adapter.labels.working
                  : rowFor(active)
                    ? adapter.labels.refresh
                    : adapter.labels.translate}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void runTranslate(targets, "__all__")}
              disabled={busy !== null || saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy === "__all__" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Languages className="h-3 w-3" />
              )}
              {busy === "__all__" ? adapter.labels.working : translateAllLabel}
            </button>
          </div>
        </div>

        {active && activeRow && activeDraft ? (
          <div className="space-y-3 border-t border-border pt-3">
            {adapter.fields.map((field) => (
              <FieldBlock
                key={field.key}
                field={field}
                value={activeDraft[field.key] ?? ""}
                onChange={(value) =>
                  setDrafts((current) => ({
                    ...current,
                    [active]: { ...(current[active] as Values), [field.key]: value } as Values,
                  }))
                }
                isPreview={adapter.previewField === field.key && preview}
                onTogglePreview={
                  adapter.previewField === field.key ? () => setPreview((p) => !p) : undefined
                }
                previewWrite={adapter.labels.previewWrite}
                previewShow={adapter.labels.previewShow}
              />
            ))}
          </div>
        ) : (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            {adapter.labels.emptyState ?? adapter.labels.notTranslated}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={!isDirty || saving || busy !== null}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {adapter.labels.saveTranslation}
          </button>
          <button
            type="button"
            onClick={() => void discard()}
            disabled={!isDirty || saving || busy !== null}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
          >
            {adapter.labels.discard ?? adapter.labels.close}
          </button>
          {isDirty ? (
            <span className="text-xs text-[color:var(--warn)]">
              {adapter.labels.unsaved ?? ""}
            </span>
          ) : savedNote ? (
            <span className="text-xs text-muted-foreground">{adapter.labels.savedTranslation}</span>
          ) : null}
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

function FieldBlock({
  field,
  value,
  onChange,
  isPreview,
  onTogglePreview,
  previewWrite,
  previewShow,
}: {
  field: TranslationFieldConfig;
  value: string;
  onChange: (value: string) => void;
  isPreview: boolean;
  onTogglePreview?: () => void;
  previewWrite?: string;
  previewShow?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {field.label}
      </label>
      {field.type === "input" ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
      ) : field.type === "rich" ? (
        <MarkdownEditor
          value={value}
          rows={field.rows ?? 8}
          modes={["write", "preview"]}
          onChange={onChange}
        />
      ) : onTogglePreview ? (
        <div className="space-y-2">
          <textarea
            rows={field.rows ?? 10}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full resize-y rounded-lg border border-border bg-card px-2 py-1.5 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            type="button"
            onClick={onTogglePreview}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-medium hover:bg-secondary"
          >
            <Eye className="h-3 w-3" />
            {isPreview ? previewWrite : previewShow}
          </button>
          {isPreview ? (
            <MarkdownPreview
              content={value}
              className="rounded-xl border border-border bg-card p-4"
            />
          ) : null}
        </div>
      ) : (
        <textarea
          rows={field.rows ?? 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
      )}
    </div>
  );
}
