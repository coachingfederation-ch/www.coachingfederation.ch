/**
 * Publisher action: share a published article on the chapter's LinkedIn page.
 * Exports: LinkedInShareCard. Rendered in ArticleMetaSidebar.tsx.
 *
 * The flow is deliberately two-step — draft, then explicit confirmation — and
 * the visual is rasterised in the browser so the publisher posts exactly the
 * image they approved.
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Linkedin, ExternalLink, Shuffle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/design-system/icf-welcome-design-system-a835df";
import { LinkedInCard } from "@/components/cms/LinkedInCard";
import { toDataUrl } from "@/lib/linkedin-image";
import {
  linkedInVariantIndex,
  sanitizeMarkLayout,
  suggestedLayout,
  type PlacedMark,
} from "@/lib/linkedin-visuals";
import { LinkedInMarkEditor } from "@/components/cms/LinkedInMarkEditor";
import { useCms } from "@/i18n/cms";
import { getLinkedInDraft, publishArticleToLinkedIn } from "@/lib/linkedin.functions";
import {
  LINKEDIN_CARD_HEIGHT,
  LINKEDIN_CARD_WIDTH,
  LINKEDIN_COMMENTARY_LIMIT,
  type LinkedInImageMode,
  type LinkedInPostRecord,
} from "@/lib/linkedin";

type Draft = Awaited<ReturnType<typeof getLinkedInDraft>>;

export function LinkedInShareCard({
  articleId,
  canShare,
  isPublished,
  categoryLabel,
}: {
  articleId: string;
  canShare: boolean;
  isPublished: boolean;
  categoryLabel: string;
}) {
  const { t } = useCms();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [commentary, setCommentary] = useState("");
  const [mode, setMode] = useState<LinkedInImageMode>("feature");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [variant, setVariant] = useState(() => linkedInVariantIndex(articleId));
  const [marks, setMarks] = useState<PlacedMark[]>(() =>
    suggestedLayout(linkedInVariantIndex(articleId)),
  );
  const [latest, setLatest] = useState<LinkedInPostRecord | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  if (!canShare) return null;

  const openDialog = async () => {
    setLoading(true);
    try {
      const data = await getLinkedInDraft({ data: { articleId } });
      setDraft(data);
      setCommentary(data.commentary);
      setLatest(data.latest);
      const photo = data.article.featured_image_url
        ? await toDataUrl(data.article.featured_image_url)
        : null;
      setImageDataUrl(photo);
      setMode(photo ? "feature" : "marks");
      const seed = linkedInVariantIndex(articleId);
      setVariant(seed);
      const saved = sanitizeMarkLayout(data.latest?.mark_layout);
      setMarks(saved && saved.length > 0 ? saved : suggestedLayout(seed));
      setOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("linkedin.draftFailed"));
    } finally {
      setLoading(false);
    }
  };

  const confirmPost = async () => {
    if (!cardRef.current) return;
    setPosting(true);
    try {
      const png = await toPng(cardRef.current, {
        width: LINKEDIN_CARD_WIDTH,
        height: LINKEDIN_CARD_HEIGHT,
        pixelRatio: 1,
        cacheBust: true,
      });
      const record = await publishArticleToLinkedIn({
        data: { articleId, commentary, imageMode: mode, imageBase64: png, markLayout: marks },
      });
      setLatest(record);
      setOpen(false);
      toast.success(t("linkedin.posted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("linkedin.postFailed"));
    } finally {
      setPosting(false);
    }
  };

  const ready = draft?.readiness.connected && !!draft.readiness.organizationUrn;

  return (
    <div>
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("linkedin.section")}
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
        {latest?.status === "posted" && latest.linkedin_post_url ? (
          <p className="text-xs text-muted-foreground">
            {t("linkedin.alreadyPosted")}{" "}
            <a
              href={latest.linkedin_post_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              {latest.posted_at ? new Date(latest.posted_at).toLocaleString() : ""}
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        ) : latest?.status === "failed" ? (
          <p className="text-xs text-destructive">
            {t("linkedin.lastFailed")} {latest.error_message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("linkedin.hint")}</p>
        )}
        <button
          onClick={() => void openDialog()}
          disabled={!isPublished || loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Linkedin className="h-4 w-4" />
          {loading ? t("linkedin.preparing") : t("linkedin.action")}
        </button>
        {!isPublished ? (
          <p className="text-xs text-muted-foreground">{t("linkedin.needsPublished")}</p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(next) => (posting ? null : setOpen(next))}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("linkedin.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {draft?.readiness.organizationName
                ? `${t("linkedin.postingTo")} ${draft.readiness.organizationName}`
                : t("linkedin.dialogBody")}
            </DialogDescription>
          </DialogHeader>

          {!ready ? (
            <p className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm">
              {draft?.readiness.connected ? t("linkedin.noPage") : t("linkedin.notConnected")}
            </p>
          ) : null}

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("linkedin.visual")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 rounded-full border border-border p-0.5">
                    {(["feature", "marks"] as LinkedInImageMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        disabled={m === "feature" && !imageDataUrl}
                        className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-40 ${
                          mode === m
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t(`linkedin.mode.${m}`)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = variant + 1;
                      setVariant(next);
                      setMarks(suggestedLayout(next));
                    }}
                    disabled={mode === "feature"}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-40"
                  >
                    <Shuffle className="h-3 w-3" />
                    {t("linkedin.suggest")}
                  </button>
                </div>
              </div>
              {/* Preview is a scaled clone; the ref'd node below is rasterised at full size. */}
              {mode === "marks" ? (
                <LinkedInMarkEditor
                  marks={marks}
                  onChange={setMarks}
                  width={LINKEDIN_CARD_WIDTH * 0.5}
                  height={LINKEDIN_CARD_HEIGHT * 0.5}
                  labels={{
                    palette: t("linkedin.brushes"),
                    limit: t("linkedin.markLimit"),
                    overlap: t("linkedin.markOverlap"),
                    remove: t("linkedin.markRemove"),
                    colour: t("linkedin.markColour"),
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ transform: "scale(0.5)", transformOrigin: "top left" }}
                  >
                    <LinkedInCard
                      title={draft?.article.title ?? ""}
                      kicker={categoryLabel}
                      mode={mode}
                      imageDataUrl={imageDataUrl}
                      marks={marks}
                    />
                  </div>
                </LinkedInMarkEditor>
              ) : (
                <div
                  className="overflow-hidden rounded-xl border border-border"
                  style={{ width: LINKEDIN_CARD_WIDTH * 0.5, height: LINKEDIN_CARD_HEIGHT * 0.5 }}
                >
                  <div style={{ transform: "scale(0.5)", transformOrigin: "top left" }}>
                    <LinkedInCard
                      title={draft?.article.title ?? ""}
                      kicker={categoryLabel}
                      mode={mode}
                      imageDataUrl={imageDataUrl}
                      marks={marks}
                    />
                  </div>
                </div>
              )}
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("linkedin.commentary")}
              </span>
              <textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value.slice(0, LINKEDIN_COMMENTARY_LIMIT))}
                rows={10}
                className="mt-2 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                {commentary.length}/{LINKEDIN_COMMENTARY_LIMIT} · {t("linkedin.languages")}
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={posting}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                {t("linkedin.cancel")}
              </button>
              <button
                onClick={() => void confirmPost()}
                disabled={posting || !ready || commentary.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Linkedin className="h-4 w-4" />
                {posting ? t("linkedin.posting") : t("linkedin.confirm")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Off-screen full-size render target for html-to-image. */}
      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
        <LinkedInCard
          ref={cardRef}
          title={draft?.article.title ?? ""}
          kicker={categoryLabel}
          mode={mode}
          imageDataUrl={imageDataUrl}
          marks={marks}
        />
      </div>
    </div>
  );
}
