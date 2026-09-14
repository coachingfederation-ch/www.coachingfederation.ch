/**
 * Member Area — per-language versions of a coach profile.
 *
 * Mirrors the Insights `TranslationsPanel`: a status badge per language,
 * opt-in AI translation, inline manual refinement, and a confirmation before
 * an auto-translation can overwrite hand-written text. Nothing is generated
 * unless the coach asks for it.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2 } from "lucide-react";
import { useCms } from "@/i18n/cms";
import { RichTextEditor } from "@/components/cms/RichTextField";
import { LOCALE_ORDER, type Locale } from "@/i18n/config";
import {
  FIELD_MAX,
  LONG_FIELDS,
  TEAM_FIELDS,
  TRANSLATABLE_FIELDS,
  translationState,
  type ProfileTranslation,
  type ProfileTranslationValues,
  type TranslatableField,
  type TranslationState,
} from "@/lib/member-translations";
import {
  deleteMyProfileTranslationFn,
  getMyProfileTranslations,
  saveMyProfileTranslationFn,
  setMyProfilePrimaryLocale,
  setMyProfileTranslationReady,
  translateMyProfile,
} from "@/lib/member-translations.functions";

type Payload = {
  profileId: string;
  primaryLocale: string;
  contentUpdatedAt: string | null;
  source: ProfileTranslationValues;
  rows: ProfileTranslation[];
};

const BADGE: Record<TranslationState, string> = {
  missing: "bg-secondary text-muted-foreground",
  auto_draft: "bg-secondary text-foreground",
  edited_draft: "bg-secondary text-foreground",
  published: "bg-teal-soft text-teal-foreground",
  outdated: "bg-warn-soft text-[color:var(--warn)]",
};

export function ProfileTranslationsPanel({
  /** Team fields are irrelevant — and hidden — for members outside the operational structure. */
  showTeamFields = false,
  /**
   * Bumped by the profile editor after every successful save. The panel reads
   * the *saved* profile server-side, so without this it would keep judging
   * "is there anything to translate?" against the state the page loaded with.
   */
  refreshKey = 0,
}: { showTeamFields?: boolean; refreshKey?: number } = {}) {
  const { t } = useCms();
  const fields = showTeamFields
    ? TRANSLATABLE_FIELDS
    : TRANSLATABLE_FIELDS.filter((f) => !TEAM_FIELDS.includes(f));
  const load = useServerFn(getMyProfileTranslations);
  const runTranslate = useServerFn(translateMyProfile);
  const runSave = useServerFn(saveMyProfileTranslationFn);
  const runReady = useServerFn(setMyProfileTranslationReady);
  const runDelete = useServerFn(deleteMyProfileTranslationFn);
  const runPrimary = useServerFn(setMyProfilePrimaryLocale);

  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openLocale, setOpenLocale] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileTranslationValues | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const next = (await load({})) as Payload;
        // A newer refresh may have resolved first; never clobber it.
        if (active) setData(next);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (error && !data) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("profileTranslations.working")}
      </p>
    );
  }

  const rowFor = (locale: string) => data.rows.find((r) => r.locale === locale);
  const stateFor = (locale: string) => translationState(rowFor(locale), data.contentUpdatedAt);
  const targets = LOCALE_ORDER.filter((l) => l !== data.primaryLocale);
  // The server rejects a translation request when the source profile is empty;
  // mirror that rule in the UI so the button is never a dead end.
  const hasSourceText = fields.some((f) => (data.source[f] ?? "").trim().length > 0);

  const guard = async (locale: string, run: () => Promise<unknown>) => {
    setError(null);
    setBusy(locale);
    try {
      setData((await run()) as Payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileTranslations.failed"));
    } finally {
      setBusy(null);
    }
  };

  const translate = async (locale: Locale) => {
    if (!hasSourceText) {
      setError(t("profileTranslations.emptySource"));
      return;
    }
    const row = rowFor(locale);
    // Re-running the machine over hand-written text is destructive, so it is
    // always an explicit decision.
    if (row?.manually_edited && !window.confirm(t("profileTranslations.confirmOverwrite"))) return;
    setOpenLocale(null);
    await guard(locale, () => runTranslate({ data: { locale } }));
  };

  const openEditor = (locale: string) => {
    const row = rowFor(locale);
    if (!row) return;
    const values: ProfileTranslationValues = {};
    for (const field of TRANSLATABLE_FIELDS) values[field] = row[field] ?? "";
    setDraft(values);
    setOpenLocale(locale);
    setSavedNote(null);
  };

  const save = async (locale: string) => {
    if (!draft) return;
    await guard(locale, () => runSave({ data: { locale, values: draft } }));
    setSavedNote(locale);
  };

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Languages className="h-4 w-4" />
        {t("profileTranslations.title")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("profileTranslations.hint")}</p>
      {!hasSourceText && (
        <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-[color:var(--warn)]">
          {t("profileTranslations.emptySource")}
        </p>
      )}

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <label
            htmlFor="primary-locale"
            className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("profileTranslations.primaryLabel")}
          </label>
          <select
            id="primary-locale"
            value={data.primaryLocale}
            disabled={data.rows.length > 0 || busy !== null}
            onChange={(e) =>
              void guard("primary", () =>
                runPrimary({ data: { locale: e.target.value as Locale } }),
              )
            }
            className="mt-1.5 rounded-lg border border-border bg-card px-2 py-1.5 text-sm disabled:opacity-60"
          >
            {LOCALE_ORDER.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {data.rows.length > 0
              ? t("profileTranslations.primaryLocked")
              : t("profileTranslations.primaryHint")}
          </p>
        </div>

        {targets.map((locale) => {
          const row = rowFor(locale);
          const state = stateFor(locale);
          return (
            <div key={locale} className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{locale.toUpperCase()}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[state]}`}
                >
                  {t(`profileTranslations.states.${state}`)}
                </span>
              </div>

              {state === "outdated" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("profileTranslations.outdatedHint")}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void translate(locale)}
                  disabled={busy !== null || !hasSourceText}
                  title={!hasSourceText ? t("profileTranslations.emptySource") : undefined}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy === locale ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {busy === locale
                    ? t("profileTranslations.working")
                    : row
                      ? t("profileTranslations.refresh")
                      : t("profileTranslations.translate")}
                </button>

                {row && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        openLocale === locale ? setOpenLocale(null) : openEditor(locale)
                      }
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      {openLocale === locale
                        ? t("profileTranslations.close")
                        : t("profileTranslations.open")}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void guard(locale, () =>
                          runReady({ data: { locale, isReady: !row.is_ready } }),
                        )
                      }
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
                    >
                      {row.is_ready
                        ? t("profileTranslations.unpublish")
                        : t("profileTranslations.publish")}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        if (!window.confirm(t("profileTranslations.confirmRemove"))) return;
                        setOpenLocale(null);
                        void guard(locale, () => runDelete({ data: { locale } }));
                      }}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-destructive hover:bg-secondary disabled:opacity-60"
                    >
                      {t("profileTranslations.remove")}
                    </button>
                  </>
                )}
              </div>

              {openLocale === locale && draft && (
                <div className="mt-4 space-y-3">
                  {fields.map((field) => (
                    <FieldEditor
                      key={field}
                      field={field}
                      label={t(`profileTranslations.fields.${field}`)}
                      sourceLabel={t("profileTranslations.source")}
                      source={data.source[field] ?? ""}
                      value={draft[field] ?? ""}
                      onChange={(value) => setDraft({ ...draft, [field]: value })}
                    />
                  ))}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void save(locale)}
                      disabled={busy !== null}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {t("profileTranslations.save")}
                    </button>
                    {savedNote === locale && (
                      <span className="text-xs text-muted-foreground">
                        {t("profileTranslations.saved")}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </section>
  );
}

function FieldEditor({
  field,
  label,
  sourceLabel,
  source,
  value,
  onChange,
}: {
  field: TranslatableField;
  label: string;
  sourceLabel: string;
  source: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // Fields the coach left blank in the main language are not worth showing.
  if (!source.trim() && !value.trim()) return null;
  // Testimonial quotes stay plain: one quoted sentence needs no formatting.
  const long = LONG_FIELDS.includes(field) && field !== "testimonial_quote";
  const plainLong = field === "testimonial_quote";
  const id = `translation-${field}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      {source.trim() && (
        <p className="mt-1 rounded-lg bg-secondary px-2 py-1.5 text-xs text-muted-foreground">
          <span className="font-semibold">{sourceLabel}: </span>
          {source}
        </p>
      )}
      {long ? (
        <div className="mt-1.5">
          <RichTextEditor
            id={id}
            value={value}
            minHeight="9rem"
            onChange={(next) => onChange(next.slice(0, FIELD_MAX[field]))}
          />
        </div>
      ) : plainLong ? (
        <textarea
          id={id}
          rows={4}
          maxLength={FIELD_MAX[field]}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full resize-y rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
      ) : (
        <input
          id={id}
          maxLength={FIELD_MAX[field]}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
      )}
    </div>
  );
}
