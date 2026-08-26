/**
 * Full social post editor for an event recap.
 * Exports: RecapPostEditor. Opened from EventRecapEditor.tsx.
 *
 * Composing a carousel is a different job from writing the recap story, so it
 * gets its own full-screen dialog: commentary (with an AI draft) and slide
 * selection on the left, a live LinkedIn-shaped preview on the right. The
 * branded cover slide is rasterised in the browser, exactly like the article
 * card, so the publisher posts the image they approved.
 */
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/design-system/icf-welcome-design-system-a835df";
import { LinkedInPostPreview, type PreviewSlide } from "./LinkedInPostPreview";
import { RECAP_COVER_SIZE, RecapCoverSlide } from "./RecapCoverSlide";
import { draftRecapPost, publishRecapToLinkedIn, saveRecapPostDraft } from "@/lib/event-recaps-admin.functions";

/** LinkedIn refuses a multi-image post above nine images, cover included. */
const MAX_SLIDES = 9;

const TONES = ["warm", "professional", "celebratory"] as const;
type Tone = (typeof TONES)[number];

export type RecapPhoto = { id?: string; preview: string | null; alt: string | null; caption: string | null };

export type RecapPostDraft = { commentary: string; withCover: boolean; slideIds: string[] };

export function RecapPostEditor({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  headline,
  meta,
  photos,
  draft,
  canPublish,
  onPosted,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  headline: string;
  meta: string;
  photos: RecapPhoto[];
  draft: RecapPostDraft | null;
  canPublish: boolean;
  onPosted: () => Promise<void> | void;
  t: (key: string) => string;
}) {
  const saved = photos.filter((p): p is RecapPhoto & { id: string } => Boolean(p.id));

  const [commentary, setCommentary] = useState(draft?.commentary ?? "");
  const [tone, setTone] = useState<Tone>("warm");
  const [withCover, setWithCover] = useState(draft?.withCover ?? true);
  const [selected, setSelected] = useState<string[]>(
    draft?.slideIds?.length ? draft.slideIds : saved.map((p) => p.id).slice(0, MAX_SLIDES - 1),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);

  const byId = useMemo(() => new Map(saved.map((p) => [p.id, p])), [saved]);
  const ordered = selected.map((id) => byId.get(id)).filter(Boolean) as (RecapPhoto & {
    id: string;
  })[];

  const slides: PreviewSlide[] = [
    ...(withCover ? [{ id: "cover", src: null, alt: headline || eventTitle }] : []),
    ...ordered.map((p) => ({ id: p.id, src: p.preview, alt: p.alt ?? p.caption ?? "" })),
  ];
  const limit = withCover ? MAX_SLIDES - 1 : MAX_SLIDES;

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("recap.saveError"));
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length >= limit
          ? current
          : [...current, id],
    );

  const move = (index: number, delta: number) =>
    setSelected((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const draftPayload = (): RecapPostDraft => ({
    commentary: commentary.slice(0, 3000),
    withCover,
    slideIds: selected.slice(0, limit),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("recap.post.title")}</DialogTitle>
          <DialogDescription>{t("recap.post.hint")}</DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-8 md:grid-cols-2">
          {/* Composer */}
          <div>
            <label className="block text-sm font-medium">
              {t("recap.post.commentary")}
              <textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                rows={10}
                maxLength={3000}
                placeholder={t("recap.linkedinPlaceholder")}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="rounded-full border border-input bg-background px-3 py-1.5 text-sm"
                aria-label={t("recap.post.toneLabel")}
              >
                {TONES.map((value) => (
                  <option key={value} value={value}>
                    {t(`recap.post.tone.${value}`)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() =>
                  run("draft", async () => {
                    const result = await draftRecapPost({ data: { eventId, tone } });
                    setCommentary(result.commentary);
                  })
                }
              >
                {busy === "draft" ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {t("recap.post.draftWithAi")}
              </Button>
              <span className="text-xs text-muted-foreground">{commentary.length}/3000</span>
            </div>

            <label className="mt-6 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={withCover}
                onChange={(e) => setWithCover(e.target.checked)}
              />
              {t("recap.post.cover")}
            </label>

            <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("recap.post.slides")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("recap.post.slidesHint")
                .replace("{count}", String(selected.length))
                .replace("{max}", String(limit))}
            </p>

            <ul className="mt-3 space-y-2">
              {ordered.map((photo, index) => (
                <li
                  key={photo.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-2"
                >
                  {photo.preview ? (
                    <img src={photo.preview} alt="" className="h-12 w-16 rounded-lg object-cover" />
                  ) : (
                    <span className="h-12 w-16 rounded-lg bg-secondary" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {photo.alt ?? photo.caption ?? ""}
                  </span>
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
                    onClick={() => toggle(photo.id)}
                    className="rounded-lg border border-border px-2 py-1 text-xs"
                  >
                    {t("recap.remove")}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap gap-2">
              {saved
                .filter((photo) => !selected.includes(photo.id))
                .map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => toggle(photo.id)}
                    disabled={selected.length >= limit}
                    className="rounded-lg border border-border p-1 disabled:opacity-50"
                    aria-label={t("recap.post.addSlide")}
                  >
                    {photo.preview ? (
                      <img src={photo.preview} alt="" className="h-12 w-16 rounded-md object-cover" />
                    ) : (
                      <span className="block h-12 w-16 rounded-md bg-secondary" aria-hidden />
                    )}
                  </button>
                ))}
            </div>
          </div>

          {/* Live preview */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("recap.post.preview")}
            </h3>
            <div className="mt-3">
              <LinkedInPostPreview
                commentary={commentary}
                slides={slides}
                pageName={t("recap.post.pageName")}
                labels={{
                  empty: t("recap.post.previewEmpty"),
                  slideOf: t("recap.post.slideOf"),
                  previous: t("recap.post.previous"),
                  next: t("recap.post.next"),
                }}
              />
            </div>
            {withCover ? (
              <p className="mt-2 text-xs text-muted-foreground">{t("recap.post.coverNote")}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              run("save", async () => {
                await saveRecapPostDraft({ data: { eventId, draft: draftPayload() } });
              })
            }
          >
            {busy === "save" ? t("recap.saving") : t("recap.post.saveDraft")}
          </Button>
          <Button
            type="button"
            className="ms-auto"
            disabled={
              busy !== null || !canPublish || commentary.trim().length === 0 || slides.length === 0
            }
            onClick={() =>
              run("publish", async () => {
                let coverDataUrl: string | null = null;
                if (withCover && coverRef.current) {
                  coverDataUrl = await toPng(coverRef.current, {
                    width: RECAP_COVER_SIZE,
                    height: RECAP_COVER_SIZE,
                    pixelRatio: 1,
                    cacheBust: true,
                  });
                }
                await saveRecapPostDraft({ data: { eventId, draft: draftPayload() } });
                await publishRecapToLinkedIn({
                  data: {
                    eventId,
                    commentary: commentary.trim(),
                    slideIds: selected.slice(0, limit),
                    coverDataUrl,
                  },
                });
                await onPosted();
                onOpenChange(false);
              })
            }
          >
            {busy === "publish" ? t("recap.linkedinPosting") : t("recap.post.publish")}
          </Button>
        </div>

        {/* Rasterised off-screen at full size; never visible to the publisher. */}
        <div className="pointer-events-none fixed -left-[10000px] top-0" aria-hidden>
          <RecapCoverSlide
            ref={coverRef}
            kicker={t("recap.post.coverKicker")}
            headline={headline || eventTitle}
            meta={meta}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
