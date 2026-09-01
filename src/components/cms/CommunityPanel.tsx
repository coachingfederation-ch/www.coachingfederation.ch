/**
 * Operational-structure CMS: the community-specific fields of a project.
 *
 * Communities are not a separate entity — they are `op_projects` rows flagged
 * `is_community`. This panel edits that flag plus the public-facing content
 * (markdown description, meeting cadence, contact, sign-up link, spoken
 * languages) and offers per-locale AI translation, mirroring the article and
 * event translation panels.
 *
 * Writes go through the caller's RLS-scoped client; the "admins manage
 * op_projects" policy remains the real boundary.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Languages, Loader2, Sparkles, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { MarkdownEditor } from "@/components/cms/MarkdownEditor";
import { UnsplashPicker } from "@/components/cms/UnsplashPicker";
import { AiBadge } from "@/design-system/icf-welcome-design-system-a835df";
import { ARTICLE_IMAGE_BUCKET, ARTICLE_IMAGE_TTL_SECONDS } from "@/lib/storage";
import { translateCommunity } from "@/lib/community-translations.functions";
import { generateCommunityImageFn } from "@/lib/community-images.functions";

const INPUT =
  "w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20";
const TARGETS = ["de", "fr", "it"] as const;
type Target = (typeof TARGETS)[number];

export type CommunityFields = {
  id: string;
  is_community: boolean;
  is_featured_community: boolean;
  description: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
  /** Chosen from the `cf_cadences` vocabulary; the notes below are derived. */
  cadence_slug: string | null;
  cadence_note: string | null;
  cadence_note_de: string | null;
  cadence_note_fr: string | null;
  cadence_note_it: string | null;
  contact_email: string | null;
  signup_url: string | null;
  language_slugs: string[] | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  image_source: string | null;
  image_credit_name: string | null;
  image_credit_url: string | null;
};

/**
 * Text-ish columns edited in the local buffer and written by the Save CTA.
 * Everything not listed here (image binaries, language and region links) is
 * applied immediately, because those actions already create a server artefact.
 */
const BUFFERED_FIELDS = [
  "is_featured_community",
  "contact_email",
  "signup_url",
  "description",
  "description_de",
  "description_fr",
  "description_it",
  "cover_image_alt",
  "cover_image_url",
  "image_source",
  "image_credit_name",
  "image_credit_url",
] as const satisfies readonly (keyof CommunityFields)[];

/**
 * Columns the browser client may re-read after a server-side write.
 * `contact_email` is deliberately absent: `authenticated` has no column-level
 * SELECT grant on it (only `public_contact_email` is exposed), and a single
 * ungranted column makes PostgREST reject the whole row — which is why a
 * refetch after "Translate with AI" used to return nothing at all.
 */
const REFETCH_COLUMNS =
  "id, is_community, is_featured_community, description, description_de, description_fr, description_it, cadence_slug, cadence_note, cadence_note_de, cadence_note_fr, cadence_note_it, signup_url, language_slugs, cover_image_url, cover_image_alt, image_source, image_credit_name, image_credit_url";

function changedFields(row: CommunityFields, base: CommunityFields): Partial<CommunityFields> {
  const out: Record<string, unknown> = {};
  for (const key of BUFFERED_FIELDS) {
    const next = row[key] ?? null;
    const prev = base[key] ?? null;
    if (next !== prev) out[key] = next;
  }
  return out as Partial<CommunityFields>;
}

export function CommunityPanel({
  project,
  onSaved,
  onDirtyChange,
}: {
  project: CommunityFields;
  onSaved: () => void | Promise<void>;
  /** Lets the page warn before switching away with unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t } = useCms();
  // `row` is the edit buffer; `saved` is the last state known to be on the
  // server. A refetch triggered by an unrelated part of the page must never
  // reset the buffer, so the prop is only read when the project id changes.
  const [row, setRow] = useState<CommunityFields>(project);
  const [saved, setSaved] = useState<CommunityFields>(project);
  const [languages, setLanguages] = useState<{ slug: string; name: string }[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [regionIds, setRegionIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<Target | null>(null);
  // Per-language feedback sits next to the button that triggered it; the
  // panel-level error banner is too far away to be noticed.
  const [localeNote, setLocaleNote] = useState<
    Partial<Record<Target, { ok: boolean; text: string } | null>>
  >({});
  const [cadences, setCadences] = useState<VocabRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsplashOpen, setUnsplashOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [brief, setBrief] = useState("");

  const pending = changedFields(row, saved);
  const dirty = Object.keys(pending).length > 0;

  useEffect(() => {
    setRow(project);
    setSaved(project);
    // Only a different community replaces the buffer; refetches of the same
    // row must not discard what the editor is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // Keep the callback in a ref so an inline parent arrow does not re-fire the
  // notification on every render.
  const dirtyCb = useRef(onDirtyChange);
  dirtyCb.current = onDirtyChange;
  useEffect(() => {
    dirtyCb.current?.(dirty);
    return () => dirtyCb.current?.(false);
  }, [dirty]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("cf_languages")
        .select("slug, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setLanguages((data ?? []) as { slug: string; name: string }[]);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("cf_regions")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setRegions((data ?? []) as { id: string; name: string }[]);
    })();
  }, []);

  // Cadence is a managed vocabulary, so the four localised cadence notes are
  // derived from the chosen entry instead of being typed per language.
  useEffect(() => {
    void (async () => {
      try {
        setCadences(await fetchVocabulary("cf_cadences", { activeOnly: true }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  // Region links drive the "communities in your service area" block in the
  // Member Area, so they live with the rest of the community content.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("op_project_regions")
        .select("region_id")
        .eq("project_id", project.id);
      setRegionIds((data ?? []).map((r) => r.region_id as string));
    })();
  }, [project.id]);

  const toggleRegion = async (regionId: string) => {
    const attached = regionIds.includes(regionId);
    setRegionIds((prev) => (attached ? prev.filter((id) => id !== regionId) : [...prev, regionId]));
    const query = attached
      ? supabase
          .from("op_project_regions")
          .delete()
          .eq("project_id", project.id)
          .eq("region_id", regionId)
      : supabase.from("op_project_regions").insert({ project_id: project.id, region_id: regionId });
    const { error: err } = await query;
    if (err) setError(err.message);
  };

  /**
   * Immediate write for actions that already produced a server artefact
   * (uploads, AI images, language links). Both the buffer and the baseline
   * move, so the Save CTA does not then report a phantom change.
   */
  const savePatch = async (values: Partial<CommunityFields>) => {
    setRow((prev) => ({ ...prev, ...values }));
    setSaved((prev) => ({ ...prev, ...values }));
    const { error: err } = await supabase
      .from("op_projects")
      .update(values as never)
      .eq("id", project.id);
    if (err) return setError(err.message);
    setError(null);
    await onSaved();
  };

  /**
   * Pull the readable columns back from the server and move both buffer and
   * baseline. Merged rather than replaced, because `contact_email` is not in
   * the readable set. Failures are surfaced — a silent return is what made an
   * AI translation look like it had done nothing.
   */
  const refetch = async (): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from("op_projects")
      .select(REFETCH_COLUMNS)
      .eq("id", project.id)
      .maybeSingle();
    if (err) return err.message;
    if (!data) return "Community not found";
    const fresh = data as unknown as Partial<CommunityFields>;
    setRow((prev) => ({ ...prev, ...fresh }));
    setSaved((prev) => ({ ...prev, ...fresh }));
    return null;
  };

  /** The Save CTA: writes only the buffered columns that actually changed. */
  const saveAll = useCallback(async () => {
    const values = changedFields(row, saved);
    if (!Object.keys(values).length || saving) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("op_projects")
      .update(values as never)
      .eq("id", project.id);
    setSaving(false);
    if (err) return setError(err.message);
    setError(null);
    setSaved(row);
    await onSaved();
  }, [row, saved, saving, project.id, onSaved]);

  const discard = () => {
    setRow(saved);
    setError(null);
  };

  // Cmd/Ctrl+S saves, matching the rest of the CMS editors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveAll]);

  const uploadImage = async (file: File) => {
    setError(null);
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `communities/${project.id}/${Date.now()}.${ext}`;
    // The upload stays on the browser client (RLS on storage.objects is the
    // boundary), mirroring the article cover image.
    const { error: upErr } = await supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      return setError(upErr.message);
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .createSignedUrl(path, ARTICLE_IMAGE_TTL_SECONDS);
    setUploading(false);
    if (signErr || !signed) return setError(signErr?.message ?? "Upload failed");
    await savePatch({
      cover_image_url: signed.signedUrl,
      image_source: "upload",
      image_credit_name: null,
      image_credit_url: null,
    });
  };

  const generateImage = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateCommunityImageFn({
        data: { projectId: project.id, brief: brief.trim() || undefined },
      });
      const applied = {
        cover_image_url: result.url,
        cover_image_alt: result.alt,
        image_source: "ai",
        image_credit_name: null,
        image_credit_url: null,
      };
      setRow((p) => ({ ...p, ...applied }));
      setSaved((p) => ({ ...p, ...applied }));
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const toggleLanguage = (slug: string) => {
    const current = row.language_slugs ?? [];
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
    void savePatch({ language_slugs: next });
  };

  const translate = async (locale: Target) => {
    setBusy(locale);
    setError(null);
    setLocaleNote((prev) => ({ ...prev, [locale]: null }));
    try {
      await translateCommunity({ data: { projectId: project.id, locale } });
      const failure = await refetch();
      if (failure) {
        setLocaleNote((prev) => ({ ...prev, [locale]: { ok: false, text: failure } }));
      } else {
        setLocaleNote((prev) => ({
          ...prev,
          [locale]: { ok: true, text: t("ops.community.translated") },
        }));
      }
      await onSaved();
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setError(text);
      setLocaleNote((prev) => ({ ...prev, [locale]: { ok: false, text } }));
    } finally {
      setBusy(null);
    }
  };

  const localeField = (field: "description", locale: Target) =>
    `${field}_${locale}` as keyof CommunityFields;

  // The project-type choice lives in the parent "Project details" card; this
  // panel only renders the content behind that choice.
  if (!row.is_community) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-bold">{t("ops.community.title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("ops.community.note")}</p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={row.is_featured_community}
            onChange={(e) => setRow((p) => ({ ...p, is_featured_community: e.target.checked }))}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          {t("ops.community.featured")}
        </label>
      </div>

      {
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("ops.community.cadence")}
              <select
                value={row.cadence_slug ?? ""}
                onChange={(e) => {
                  const next = e.target.value || null;
                  // Saved straight away: the four localised notes are written
                  // by the database from this choice, so the buffer would go
                  // stale if we waited for the Save CTA.
                  void (async () => {
                    await savePatch({ cadence_slug: next });
                    await refetch();
                  })();
                }}
                className={INPUT + " mt-1 font-normal"}
              >
                <option value="">{t("ops.community.cadenceNone")}</option>
                {cadences.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block font-normal text-[11px] text-muted-foreground">
                {t("ops.community.cadenceHint")}
              </span>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("ops.community.contactEmail")}
              <input
                type="email"
                value={row.contact_email ?? ""}
                onChange={(e) => setRow((p) => ({ ...p, contact_email: e.target.value }))}
                className={INPUT + " mt-1 font-normal"}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">
              {t("ops.community.signupUrl")}
              <input
                type="url"
                value={row.signup_url ?? ""}
                onChange={(e) => setRow((p) => ({ ...p, signup_url: e.target.value }))}
                className={INPUT + " mt-1 font-normal"}
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-muted-foreground">
              {t("ops.community.image")}
            </legend>
            <p className="mt-1 text-[11px] text-muted-foreground">{t("ops.community.imageNote")}</p>
            <div className="mt-2 space-y-3">
              {row.cover_image_url ? (
                <div className="relative overflow-hidden rounded-2xl border border-border">
                  <img
                    src={row.cover_image_url}
                    alt={row.cover_image_alt ?? ""}
                    className="h-56 w-full object-cover"
                  />
                  {row.image_source === "ai" ? (
                    <AiBadge className="absolute bottom-3 left-3" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      void savePatch({
                        cover_image_url: null,
                        cover_image_alt: null,
                        image_source: null,
                        image_credit_name: null,
                        image_credit_url: null,
                      })
                    }
                    aria-label={t("ops.community.imageRemove")}
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground hover:bg-card"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60">
                  <ImageIcon className="h-7 w-7" />
                  <span className="text-xs font-semibold">
                    {uploading ? t("ops.community.imageUploading") : t("ops.community.imageUpload")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}

              {row.image_credit_name ? (
                <p className="text-[11px] text-muted-foreground">
                  {t("unsplash.creditPrefix")}{" "}
                  <a
                    href={row.image_credit_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {row.image_credit_name}
                  </a>{" "}
                  {t("unsplash.creditSuffix")}
                </p>
              ) : null}

              <input
                aria-label={t("ops.community.imageAlt")}
                placeholder={t("ops.community.imageAlt")}
                value={row.cover_image_alt ?? ""}
                onChange={(e) => setRow((p) => ({ ...p, cover_image_alt: e.target.value }))}
                className={INPUT}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  aria-label={t("ops.community.imageUrl")}
                  value={row.cover_image_url ?? ""}
                  onChange={(e) =>
                    setRow((p) => ({
                      ...p,
                      cover_image_url: e.target.value,
                      image_source: e.target.value ? "url" : null,
                      image_credit_name: null,
                      image_credit_url: null,
                    }))
                  }
                  placeholder={t("ops.community.imageUrl")}
                  className={INPUT + " min-w-40 flex-1"}
                />
                <button
                  type="button"
                  onClick={() => setUnsplashOpen(true)}
                  className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  {t("unsplash.button")}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={t("ops.community.imageBrief")}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={t("ops.community.imageBrief")}
                  className={INPUT + " min-w-40 flex-1"}
                />
                <button
                  type="button"
                  onClick={() => void generateImage()}
                  disabled={generating}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {t("ops.community.imageGenerate")}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">{t("ops.community.imageAiNote")}</p>
            </div>
          </fieldset>

          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              {t("ops.community.description")}
            </p>
            <div className="mt-1">
              <MarkdownEditor
                value={row.description ?? ""}
                rows={12}
                language="en"
                modes={["write", "preview"]}
                onChange={(next) => setRow((p) => ({ ...p, description: next }))}
              />
            </div>
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-muted-foreground">
              {t("ops.community.languages")}
            </legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {languages.map((lang) => (
                <label
                  key={lang.slug}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <input
                    type="checkbox"
                    checked={(row.language_slugs ?? []).includes(lang.slug)}
                    onChange={() => toggleLanguage(lang.slug)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {lang.name}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-muted-foreground">
              {t("ops.community.regions")}
            </legend>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("ops.community.regionsNote")}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {regions.map((region) => (
                <label
                  key={region.id}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <input
                    type="checkbox"
                    checked={regionIds.includes(region.id)}
                    onChange={() => void toggleRegion(region.id)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {region.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-xs font-bold">{t("ops.community.translations")}</h3>
            {TARGETS.map((locale) => (
              <div key={locale} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(`ops.name_${locale}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void translate(locale)}
                    disabled={busy !== null || dirty || !row.description}
                    title={dirty ? t("ops.community.saveFirst") : undefined}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    {busy === locale ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Languages className="h-3 w-3" />
                    )}
                    {t("ops.community.translate")}
                  </button>
                </div>
                <input
                  aria-label={t("ops.community.cadence")}
                  placeholder={t("ops.community.cadence")}
                  value={(row[localeField("cadence_note", locale)] as string | null) ?? ""}
                  onChange={(e) =>
                    setRow((p) => ({ ...p, [localeField("cadence_note", locale)]: e.target.value }))
                  }
                  className={INPUT + " mt-2"}
                />
                <div className="mt-2">
                  <MarkdownEditor
                    value={(row[localeField("description", locale)] as string | null) ?? ""}
                    rows={8}
                    language={locale}
                    modes={["write", "preview"]}
                    onChange={(next) =>
                      setRow((p) => ({ ...p, [localeField("description", locale)]: next }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
      <UnsplashPicker
        open={unsplashOpen}
        onOpenChange={setUnsplashOpen}
        onPick={(pick) =>
          void savePatch({
            cover_image_url: pick.url,
            image_source: "unsplash",
            image_credit_name: pick.creditName,
            image_credit_url: pick.creditUrl,
          })
        }
      />

      {/* Save state: the panel buffers text edits, so the editor needs to see
          whether their work has reached the server. */}
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex flex-wrap items-center justify-end gap-3 rounded-b-2xl border-t border-border bg-card/95 px-5 py-3 backdrop-blur">
        <span
          aria-live="polite"
          className={
            "mr-auto text-xs " + (dirty ? "font-semibold text-foreground" : "text-muted-foreground")
          }
        >
          {dirty ? t("ops.community.unsaved") : t("ops.community.saved")}
        </span>
        {dirty ? (
          <button
            type="button"
            onClick={discard}
            disabled={saving}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
          >
            {t("ops.community.discard")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {t("ops.community.save")}
        </button>
      </div>
    </section>
  );
}
