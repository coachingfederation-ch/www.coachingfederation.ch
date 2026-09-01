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
import { useEffect, useRef, useState } from "react";
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

export function CommunityPanel({
  project,
  onSaved,
}: {
  project: CommunityFields;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useCms();
  const [row, setRow] = useState<CommunityFields>(project);
  const [languages, setLanguages] = useState<{ slug: string; name: string }[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [regionIds, setRegionIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<Target | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unsplashOpen, setUnsplashOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [brief, setBrief] = useState("");
  // Markdown fields save on blur; the ref keeps the latest keystroke available
  // to the blur handler without re-creating it on every character.
  const draft = useRef<Record<string, string>>({});

  useEffect(() => setRow(project), [project]);

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

  const save = async (values: Partial<CommunityFields>) => {
    setRow((prev) => ({ ...prev, ...values }));
    const { error: err } = await supabase
      .from("op_projects")
      .update(values as never)
      .eq("id", project.id);
    if (err) return setError(err.message);
    setError(null);
    await onSaved();
  };

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
    await save({
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
      setRow((p) => ({
        ...p,
        cover_image_url: result.url,
        cover_image_alt: result.alt,
        image_source: "ai",
        image_credit_name: null,
        image_credit_url: null,
      }));
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
    void save({ language_slugs: next });
  };

  const translate = async (locale: Target) => {
    setBusy(locale);
    setError(null);
    try {
      await translateCommunity({ data: { projectId: project.id, locale } });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const localeField = (field: "description" | "cadence_note", locale: Target) =>
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
            onChange={(e) => void save({ is_featured_community: e.target.checked })}
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
              <input
                value={row.cadence_note ?? ""}
                onChange={(e) => setRow((p) => ({ ...p, cadence_note: e.target.value }))}
                onBlur={(e) => void save({ cadence_note: e.target.value || null })}
                className={INPUT + " mt-1 font-normal"}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("ops.community.contactEmail")}
              <input
                type="email"
                value={row.contact_email ?? ""}
                onChange={(e) => setRow((p) => ({ ...p, contact_email: e.target.value }))}
                onBlur={(e) => void save({ contact_email: e.target.value || null })}
                className={INPUT + " mt-1 font-normal"}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">
              {t("ops.community.signupUrl")}
              <input
                type="url"
                value={row.signup_url ?? ""}
                onChange={(e) => setRow((p) => ({ ...p, signup_url: e.target.value }))}
                onBlur={(e) => void save({ signup_url: e.target.value || null })}
                className={INPUT + " mt-1 font-normal"}
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-muted-foreground">
              {t("ops.community.image")}
            </legend>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("ops.community.imageNote")}
            </p>
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
                      void save({
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
                onBlur={(e) => void save({ cover_image_alt: e.target.value || null })}
                className={INPUT}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  aria-label={t("ops.community.imageUrl")}
                  value={row.cover_image_url ?? ""}
                  onChange={(e) => setRow((p) => ({ ...p, cover_image_url: e.target.value }))}
                  onBlur={(e) =>
                    void save({
                      cover_image_url: e.target.value || null,
                      image_source: e.target.value ? "url" : null,
                      image_credit_name: null,
                      image_credit_url: null,
                    })
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
              <p className="text-[11px] text-muted-foreground">
                {t("ops.community.imageAiNote")}
              </p>
            </div>
          </fieldset>

          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              {t("ops.community.description")}
            </p>
            <div
              className="mt-1"
              onBlur={() => {
                const next = draft.current.description;
                if (next !== undefined && next !== (row.description ?? ""))
                  void save({ description: next || null });
              }}
            >
              <MarkdownEditor
                value={row.description ?? ""}
                rows={12}
                language="en"
                modes={["write", "preview"]}
                onChange={(next) => {
                  draft.current.description = next;
                  setRow((p) => ({ ...p, description: next }));
                }}
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
                    disabled={busy !== null || !row.description}
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
                  onBlur={(e) =>
                    void save({ [localeField("cadence_note", locale)]: e.target.value || null })
                  }
                  className={INPUT + " mt-2"}
                />
                <div
                  className="mt-2"
                  onBlur={() => {
                    const key = localeField("description", locale) as string;
                    const next = draft.current[key];
                    if (next !== undefined && next !== ((row[key as keyof CommunityFields] as string | null) ?? ""))
                      void save({ [key]: next || null });
                  }}
                >
                  <MarkdownEditor
                    value={(row[localeField("description", locale)] as string | null) ?? ""}
                    rows={8}
                    language={locale}
                    modes={["write", "preview"]}
                    onChange={(next) => {
                      const key = localeField("description", locale) as string;
                      draft.current[key] = next;
                      setRow((p) => ({ ...p, [key]: next }));
                    }}
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
          void save({
            cover_image_url: pick.url,
            image_source: "unsplash",
            image_credit_name: pick.creditName,
            image_credit_url: pick.creditUrl,
          })
        }
      />
    </section>
  );
}
