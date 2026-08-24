/**
 * "After event" recap editor.
 *
 * One panel for everything that turns a finished event into an editorial page:
 * the story, the photo gallery, the attendee downloads, the machine
 * translations and the LinkedIn carousel. Photos are uploaded straight from
 * the browser into the private `event-media` bucket — the storage policies let
 * a manager write only into their own event's folder — and each picture is
 * stored twice: a web-sized rendition for the page and the untouched original
 * for the download bundle.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { Section } from "./EventEditorSections";
import { MarkdownEditor } from "./MarkdownEditor";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_MEDIA_BUCKET } from "@/lib/storage";
import { RECAP_AUDIENCES, formatFileSize, recapAssetPath } from "@/lib/event-recaps";
import type { RecapAudience } from "@/lib/event-recaps";
import {
  getManagedRecap,
  previewRecapThanksEmail,
  publishRecapToLinkedIn,
  saveRecap,
  saveRecapFiles,
  saveRecapPhotos,
  sendRecapThanksEmail,
  setRecapStatus,
  translateRecap,
} from "@/lib/event-recaps-admin.functions";

/** Longest edge of the web rendition — sharp on a retina grid, small to load. */
const WEB_MAX_EDGE = 1600;

type PhotoDraft = {
  id?: string;
  webPath: string;
  originalPath: string | null;
  caption: string | null;
  alt: string | null;
  isAi: boolean;
  preview: string | null;
};

type FileDraft = {
  id?: string;
  path: string;
  filename: string;
  label: string | null;
  sizeBytes: number | null;
  contentType: string | null;
};

type TranslationRow = { locale: string; headline: string | null; body: string | null };

const TRANSLATED_LOCALES = ["de", "fr", "it", "en"] as const;

/** Downscales in the browser so the page never serves a 6 MB camera file. */
async function webRendition(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, WEB_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process this image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process this image."))),
      "image/jpeg",
      0.82,
    ),
  );
}

export function EventRecapEditor({ eventId, t }: { eventId: string; t: (key: string) => string }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [language, setLanguage] = useState("en");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<RecapAudience>("attendees");
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [files, setFiles] = useState<FileDraft[]>([]);
  const [translations, setTranslations] = useState<TranslationRow[]>([]);
  const [linkedin, setLinkedIn] = useState<{
    status: string;
    linkedin_post_url: string | null;
    error_message: string | null;
  } | null>(null);
  const [commentary, setCommentary] = useState("");
  const [thanks, setThanks] = useState<{ total: number; pending: number }>({
    total: 0,
    pending: 0,
  });
  const [thanksLastSent, setThanksLastSent] = useState<string | null>(null);
  const [personalNote, setPersonalNote] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Raw Postgres constraint text never reaches staff. */
  const friendlyError = (e: unknown, fallbackKey: string) => {
    const raw = e instanceof Error ? e.message : "";
    if (!raw || /duplicate key value|unique constraint/i.test(raw)) return t(fallbackKey);
    return raw;
  };

  const load = useCallback(async () => {
    const data = await getManagedRecap({ data: { eventId } });
    const recap = data.recap as {
      status: "draft" | "published";
      language: string;
      headline: string | null;
      body: string | null;
      downloads_audience: RecapAudience;
      recap_email_last_sent_at: string | null;
    };
    setStatus(recap.status);
    setLanguage(recap.language);
    setHeadline(recap.headline ?? "");
    setBody(recap.body ?? "");
    setAudience(recap.downloads_audience);
    setThanksLastSent(recap.recap_email_last_sent_at ?? null);
    setThanks((data.thanks as { total: number; pending: number }) ?? { total: 0, pending: 0 });
    setPhotos(
      (data.photos as Record<string, unknown>[]).map((p) => ({
        id: p["id"] as string,
        webPath: p["web_path"] as string,
        originalPath: (p["original_path"] as string | null) ?? null,
        caption: (p["caption"] as string | null) ?? null,
        alt: (p["alt"] as string | null) ?? null,
        isAi: Boolean(p["is_ai"]),
        preview: (p["preview"] as string | null) ?? null,
      })),
    );
    setFiles(
      (data.files as Record<string, unknown>[]).map((f) => ({
        id: f["id"] as string,
        path: f["path"] as string,
        filename: f["filename"] as string,
        label: (f["label"] as string | null) ?? null,
        sizeBytes: (f["size_bytes"] as number | null) ?? null,
        contentType: (f["content_type"] as string | null) ?? null,
      })),
    );
    setTranslations(data.translations as TranslationRow[]);
    setLinkedIn(
      (data.linkedin as {
        status: string;
        linkedin_post_url: string | null;
        error_message: string | null;
      } | null) ?? null,
    );
    setLoading(false);
  }, [eventId]);

  // `t` is not a stable reference, so it stays out of the dependency list and
  // a ref guards against a second load starting while one is still in flight —
  // overlapping loads used to race on creating the recap row.
  const loadingRef = useRef(false);
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    load()
      .catch((e) => {
        setError(friendlyError(e, "recap.loadError"));
        setLoading(false);
      })
      .finally(() => {
        loadingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const run = async (key: string, action: () => Promise<void>, done?: string) => {
    setBusy(key);
    setMessage(null);
    setError(null);
    try {
      await action();
      if (done) setMessage(done);
    } catch (e) {
      setError(friendlyError(e, "recap.saveError"));
    } finally {
      setBusy(null);
    }
  };

  const upload = async (path: string, file: Blob, contentType: string) => {
    const { error: uploadError } = await supabase.storage
      .from(EVENT_MEDIA_BUCKET)
      .upload(path, file, { contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
  };

  const addPhotos = (list: FileList) =>
    run("photos", async () => {
      const added: PhotoDraft[] = [];
      for (const file of Array.from(list)) {
        const webPath = recapAssetPath(eventId, "web", `${file.name.split(".")[0]}.jpg`);
        const originalPath = recapAssetPath(eventId, "original", file.name);
        await upload(webPath, await webRendition(file), "image/jpeg");
        await upload(originalPath, file, file.type || "application/octet-stream");
        added.push({
          webPath,
          originalPath,
          caption: null,
          alt: null,
          isAi: false,
          preview: URL.createObjectURL(file),
        });
      }
      const next = [...photos, ...added];
      setPhotos(next);
      await saveRecapPhotos({ data: { eventId, photos: next.map(stripPreview) } });
      await load();
    });

  const addFiles = (list: FileList) =>
    run("files", async () => {
      const added: FileDraft[] = [];
      for (const file of Array.from(list)) {
        const path = recapAssetPath(eventId, "file", file.name);
        await upload(path, file, file.type || "application/octet-stream");
        added.push({
          path,
          filename: file.name,
          label: null,
          sizeBytes: file.size,
          contentType: file.type || null,
        });
      }
      const next = [...files, ...added];
      setFiles(next);
      await saveRecapFiles({ data: { eventId, files: next } });
      await load();
    });

  const stripPreview = (p: PhotoDraft) => ({
    ...(p.id ? { id: p.id } : {}),
    webPath: p.webPath,
    originalPath: p.originalPath,
    caption: p.caption,
    alt: p.alt,
    isAi: p.isAi,
  });

  const move = (index: number, delta: number) => {
    const next = [...photos];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setPhotos(next);
  };

  if (loading) {
    return (
      <Section title={t("recap.title")}>
        <p className="text-sm text-muted-foreground">{t("recap.loading")}</p>
      </Section>
    );
  }

  return (
    <Section title={t("recap.title")} hint={t("recap.hint")}>
      {message ? <p className="mb-3 text-sm text-teal-foreground">{message}</p> : null}
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t(`recap.status.${status}`)}
        </span>
        <button
          type="button"
          className="btn-mono text-primary"
          disabled={busy !== null}
          onClick={() =>
            run(
              "status",
              async () => {
                const next = status === "published" ? "draft" : "published";
                await setRecapStatus({ data: { eventId, status: next } });
                setStatus(next);
              },
              t("recap.saved"),
            )
          }
        >
          {status === "published" ? t("recap.unpublish") : t("recap.publish")}
        </button>
      </div>

      <label className="mt-5 block text-sm font-medium">
        {t("recap.fieldHeadline")}
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
      </label>

      <div className="mt-4">
        <p className="text-sm font-medium">{t("recap.fieldBody")}</p>
        <div className="mt-1">
          <MarkdownEditor value={body} onChange={setBody} language={language} rows={12} />
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium">
        {t("recap.fieldAudience")}
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as RecapAudience)}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          {RECAP_AUDIENCES.map((value) => (
            <option key={value} value={value}>
              {t(`recap.audience.${value}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4">
        <button
          type="button"
          disabled={busy !== null}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          onClick={() =>
            run(
              "save",
              async () => {
                await saveRecap({
                  data: {
                    eventId,
                    language: language as "en" | "de" | "fr" | "it",
                    headline: headline.trim() || null,
                    body: body.trim() || null,
                    downloadsAudience: audience,
                  },
                });
                await saveRecapPhotos({ data: { eventId, photos: photos.map(stripPreview) } });
                await saveRecapFiles({ data: { eventId, files } });
                await load();
              },
              t("recap.saved"),
            )
          }
        >
          {busy === "save" ? t("recap.saving") : t("recap.save")}
        </button>
      </div>

      {/* Gallery */}
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("recap.gallery")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("recap.galleryHint")}</p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium">
          {busy === "photos" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy === "photos" ? t("recap.uploading") : t("recap.addPhotos")}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              if (e.target.files?.length) void addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        <ul className="mt-4 space-y-3">
          {photos.map((photo, index) => (
            <li
              key={photo.id ?? photo.webPath}
              className="flex gap-3 rounded-2xl border border-border p-3"
            >
              {photo.preview ? (
                <img
                  src={photo.preview}
                  alt=""
                  className="h-20 w-28 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="h-20 w-28 shrink-0 rounded-xl bg-secondary" aria-hidden />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  value={photo.caption ?? ""}
                  placeholder={t("recap.fieldCaption")}
                  onChange={(e) => {
                    const next = [...photos];
                    next[index] = { ...photo, caption: e.target.value || null };
                    setPhotos(next);
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                />
                <input
                  value={photo.alt ?? ""}
                  placeholder={t("recap.fieldAlt")}
                  onChange={(e) => {
                    const next = [...photos];
                    next[index] = { ...photo, alt: e.target.value || null };
                    setPhotos(next);
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={photo.isAi}
                    onChange={(e) => {
                      const next = [...photos];
                      next[index] = { ...photo, isAi: e.target.checked };
                      setPhotos(next);
                    }}
                  />
                  {t("recap.fieldAi")}
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label={t("recap.moveUp")}
                  onClick={() => move(index, -1)}
                  className="rounded-lg border border-border p-1"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("recap.moveDown")}
                  onClick={() => move(index, 1)}
                  className="rounded-lg border border-border p-1"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("recap.remove")}
                  onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                  className="rounded-lg border border-border p-1 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Attachments */}
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("recap.files")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("recap.filesHint")}</p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium">
          {busy === "files" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy === "files" ? t("recap.uploading") : t("recap.addFiles")}
          <input
            type="file"
            multiple
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <ul className="mt-4 space-y-2">
          {files.map((file, index) => (
            <li key={file.id ?? file.path} className="flex items-center gap-3">
              <input
                value={file.label ?? ""}
                placeholder={file.filename}
                onChange={(e) => {
                  const next = [...files];
                  next[index] = { ...file, label: e.target.value || null };
                  setFiles(next);
                }}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
              />
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.sizeBytes) ?? ""}
              </span>
              <button
                type="button"
                aria-label={t("recap.remove")}
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="rounded-lg border border-border p-1 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Translations */}
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("recap.translations")}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {TRANSLATED_LOCALES.filter((locale) => locale !== language).map((locale) => {
            const existing = translations.find((tr) => tr.locale === locale);
            return (
              <button
                key={locale}
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  run(
                    `tr-${locale}`,
                    async () => {
                      await translateRecap({ data: { eventId, locale } });
                      await load();
                    },
                    t("recap.translated"),
                  )
                }
                className="rounded-full border border-border px-4 py-1.5 text-sm"
              >
                {busy === `tr-${locale}` ? "…" : locale.toUpperCase()}
                {existing ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* LinkedIn carousel */}
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("recap.linkedin")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("recap.linkedinHint")}</p>
        <textarea
          value={commentary}
          onChange={(e) => setCommentary(e.target.value)}
          rows={5}
          maxLength={3000}
          placeholder={t("recap.linkedinPlaceholder")}
          className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy !== null || commentary.trim().length === 0 || status !== "published"}
            onClick={() =>
              run(
                "linkedin",
                async () => {
                  await publishRecapToLinkedIn({
                    data: { eventId, commentary: commentary.trim() },
                  });
                  await load();
                },
                t("recap.linkedinPosted"),
              )
            }
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy === "linkedin" ? t("recap.linkedinPosting") : t("recap.linkedinPublish")}
          </button>
          {linkedin?.linkedin_post_url ? (
            <a
              href={linkedin.linkedin_post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("recap.linkedinView")} ↗
            </a>
          ) : null}
          {linkedin?.status === "failed" && linkedin.error_message ? (
            <span className="text-xs text-destructive">{linkedin.error_message}</span>
          ) : null}
        </div>
      </div>

      {/* Thank-you email to the attendees */}
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("recap.thanks")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("recap.thanksHint")}</p>
        <p className="mt-2 text-sm text-foreground">
          {t("recap.thanksAudience")
            .replace("{total}", String(thanks.total))
            .replace("{pending}", String(thanks.pending))}
        </p>
        {thanksLastSent ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("recap.thanksLastSent").replace(
              "{date}",
              new Date(thanksLastSent).toLocaleString("de-CH"),
            )}
          </p>
        ) : null}
        <textarea
          value={personalNote}
          onChange={(e) => setPersonalNote(e.target.value)}
          rows={3}
          maxLength={400}
          placeholder={t("recap.thanksNotePlaceholder")}
          className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy !== null || status !== "published" || thanks.pending === 0}
            onClick={() => {
              if (
                !window.confirm(t("recap.thanksConfirm").replace("{count}", String(thanks.pending)))
              )
                return;
              void run(
                "thanks",
                async () => {
                  const result = await sendRecapThanksEmail({
                    data: { eventId, personalNote: personalNote.trim() || null },
                  });
                  await load();
                  setMessage(
                    t("recap.thanksResult")
                      .replace("{sent}", String(result.sent))
                      .replace("{failed}", String(result.failed))
                      .replace("{remaining}", String(result.remaining)),
                  );
                },
                undefined,
              );
            }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy === "thanks" ? t("recap.thanksSending") : t("recap.thanksSend")}
          </button>
          <button
            type="button"
            disabled={busy !== null || status !== "published"}
            onClick={() =>
              run("thanks-preview", async () => {
                const result = await previewRecapThanksEmail({
                  data: {
                    eventId,
                    personalNote: personalNote.trim() || null,
                    locale: (["de", "fr", "it", "en"].includes(language) ? language : "en") as
                      | "de"
                      | "fr"
                      | "it"
                      | "en",
                  },
                });
                setMessage(t("recap.thanksPreviewSent").replace("{email}", result.to));
              })
            }
            className="rounded-full border border-input px-5 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy === "thanks-preview" ? t("recap.thanksSending") : t("recap.thanksPreview")}
          </button>
        </div>
      </div>
    </Section>
  );
}
