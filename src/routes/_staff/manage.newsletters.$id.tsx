/**
 * Newsletter block editor (/manage/newsletters/:id).
 *
 * The edition is a list of blocks. Asset blocks are AI-assembled from live
 * platform data and can be regenerated or discarded; content blocks reuse the
 * article Markdown editor. Every block can be enabled, renamed and reordered.
 * Publishing is gated by the same four-eye rule the database enforces, so the
 * buttons here only mirror what the trigger would allow.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowDown, ArrowUp, Eye, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { MarkdownEditor } from "@/components/cms/MarkdownEditor";
import { BlockImageField } from "@/components/cms/BlockImageField";
import { NewsletterPreviewDialog } from "@/components/cms/NewsletterPreviewDialog";
import { NewsletterSendPanel } from "@/components/cms/NewsletterSendPanel";
import { NewsletterTranslationsPanel } from "@/components/cms/NewsletterTranslationsPanel";

import { ARTICLE_ROLES, requireStaffAccess } from "@/lib/staff-guard";
import { Button, Input, Label, Switch } from "@/design-system/icf-welcome-design-system-a835df";
import {
  addNewsletterBlockFn,
  deleteNewsletterBlockFn,
  discardNewsletterBlockFn,
  generateNewsletterBlockImageFn,
  getNewsletterFn,
  regenerateNewsletterBlockFn,
  regenerateNewsletterFn,
  reorderNewsletterBlocksFn,
  saveNewsletterBlockFn,
  saveNewsletterMetaFn,
  transitionNewsletterFn,
} from "@/lib/newsletters.functions";
import { blockKind, formatIssueDate, type NewsletterBlockRow } from "@/lib/newsletters";

export const Route = createFileRoute("/_staff/manage/newsletters/$id")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, ARTICLE_ROLES),
  head: () => ({
    meta: [
      { title: "Edit newsletter — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Compose the monthly chapter newsletter from blocks." },
      { property: "og:title", content: "Edit newsletter — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content: "Compose the monthly chapter newsletter from blocks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewsletterEditor,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  review: "In review",
  scheduled: "Scheduled",
  published: "Published",
  unpublished: "Unpublished",
};

function BlockCard({
  block,
  index,
  total,
  onMove,
  onSave,
  onRegenerate,
  onGenerateImage,
  generatingImage,
  imageError,
  onDiscard,
  onDelete,
  busy,
}: {
  block: NewsletterBlockRow;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  onSave: (patch: Partial<NewsletterBlockRow>) => void;
  onRegenerate: () => void;
  onGenerateImage: () => void;
  generatingImage: boolean;
  imageError: string | null;
  onDiscard: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(block.title);
  const [content, setContent] = useState(block.content);
  const [note, setNote] = useState(block.note ?? "");
  const kind = blockKind(block.block_type);

  // The block can be rewritten under the editor by a regeneration; adopt the
  // new server value rather than keeping stale local text.
  useEffect(() => setContent(block.content), [block.content]);
  useEffect(() => setTitle(block.title), [block.title]);

  const dirty = title !== block.title || content !== block.content || note !== (block.note ?? "");

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Switch
            checked={block.enabled}
            onCheckedChange={(checked) => onSave({ enabled: checked })}
            aria-label={`Include ${block.title} in this edition`}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{block.title}</p>
            <p className="text-xs text-muted-foreground">
              {kind === "asset"
                ? "Assembled from platform data"
                : kind === "stub"
                  ? "Placeholder — add content manually"
                  : "Written by an editor"}
              {block.generated_at
                ? ` · refreshed ${new Date(block.generated_at).toLocaleDateString("en-GB")}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          {kind === "asset" ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRegenerate}
              disabled={busy}
              aria-label="Regenerate this block"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Remove this block">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <Label htmlFor={`title-${block.id}`}>Block title</Label>
          <Input
            id={`title-${block.id}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <BlockImageField
          block={block}
          onSave={onSave}
          onGenerate={onGenerateImage}
          generating={generatingImage}
          generateError={imageError}
        />

        <MarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="Write or refine this block…"
          rows={10}
        />

        <div className="space-y-1">
          <Label htmlFor={`note-${block.id}`}>Editorial note (not published)</Label>
          <Input
            id={`note-${block.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {block.source_refs?.length ? (
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="text-xs font-semibold text-foreground">Sources</p>
            <ul className="mt-1 space-y-1">
              {block.source_refs.map((ref, i) => (
                <li key={`${ref.label}-${i}`} className="truncate text-xs text-muted-foreground">
                  {ref.url ? (
                    <a href={ref.url} target="_blank" rel="noreferrer" className="underline">
                      {ref.label}
                    </a>
                  ) : (
                    ref.label
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={!dirty}
            onClick={() => onSave({ title, content, note: note || null })}
          >
            Save block
          </Button>
          {kind === "asset" && block.content ? (
            <Button variant="outline" size="sm" onClick={onDiscard}>
              Discard generation
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function NewsletterEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const get = useServerFn(getNewsletterFn);
  const saveMeta = useServerFn(saveNewsletterMetaFn);
  const saveBlockFn = useServerFn(saveNewsletterBlockFn);
  const reorder = useServerFn(reorderNewsletterBlocksFn);
  const addBlock = useServerFn(addNewsletterBlockFn);
  const removeBlock = useServerFn(deleteNewsletterBlockFn);
  const discard = useServerFn(discardNewsletterBlockFn);
  const regenerate = useServerFn(regenerateNewsletterFn);
  const regenerateBlock = useServerFn(regenerateNewsletterBlockFn);
  const generateImage = useServerFn(generateNewsletterBlockImageFn);
  const transition = useServerFn(transitionNewsletterFn);

  const queryKey = ["newsletter", id];
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => get({ data: { id } }) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const [title, setTitle] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => {
    if (data?.newsletter) setTitle(data.newsletter.title);
  }, [data?.newsletter?.title]);

  const blockMutation = useMutation({
    mutationFn: (input: { blockId: string; patch: Record<string, unknown> }) =>
      saveBlockFn({ data: { blockId: input.blockId, ...input.patch } }),
    onSuccess: invalidate,
  });
  const reorderMutation = useMutation({
    mutationFn: (blockIds: string[]) => reorder({ data: { id, blockIds } }),
    onSuccess: invalidate,
  });
  const regenerateAll = useMutation({
    mutationFn: () => regenerate({ data: { id, force: true } }),
    onSuccess: invalidate,
  });
  const regenerateOne = useMutation({
    mutationFn: (blockId: string) => regenerateBlock({ data: { blockId } }),
    onSuccess: invalidate,
  });
  // Tracked per block so one card's spinner and error never bleed into another.
  const [imageBlockId, setImageBlockId] = useState<string | null>(null);
  const imageMutation = useMutation({
    mutationFn: (blockId: string) => generateImage({ data: { blockId } }),
    onSuccess: invalidate,
  });
  const transitionMutation = useMutation({
    mutationFn: (action: "submit" | "return_to_draft" | "publish" | "unpublish") =>
      transition({ data: { id, action } }),
    onSuccess: invalidate,
  });
  const addMutation = useMutation({
    mutationFn: (blockType: string) => addBlock({ data: { id, blockType } }),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (blockId: string) => removeBlock({ data: { blockId } }),
    onSuccess: invalidate,
  });
  const discardMutation = useMutation({
    mutationFn: (blockId: string) => discard({ data: { blockId } }),
    onSuccess: invalidate,
  });
  const metaMutation = useMutation({
    mutationFn: () =>
      saveMeta({ data: { id, title, language: data?.newsletter?.language ?? "en" } }),
    onSuccess: invalidate,
  });

  if (isLoading) {
    return (
      <Shell>
        <p className="p-8 text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }
  if (!data?.newsletter) {
    return (
      <Shell>
        <div className="p-8">
          <p className="text-sm text-muted-foreground">This edition no longer exists.</p>
          <Link to="/manage/newsletters" className="text-sm underline">
            Back to newsletters
          </Link>
        </div>
      </Shell>
    );
  }

  const edition = data.newsletter;
  const blocks = data.blocks;
  const error =
    (transitionMutation.error as Error | null)?.message ??
    (regenerateAll.error as Error | null)?.message ??
    (regenerateOne.error as Error | null)?.message ??
    null;

  const move = (index: number, direction: -1 | 1) => {
    const next = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next.map((b) => b.id));
  };

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/manage/newsletters" })}
            aria-label="Back to newsletters"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">
              {formatIssueDate(edition.issue_date, "en")} ·{" "}
              {STATUS_LABEL[edition.status] ?? edition.status}
              {edition.last_refreshed_at
                ? ` · last refresh ${new Date(edition.last_refreshed_at).toLocaleDateString("en-GB")}`
                : ""}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => metaMutation.mutate()}
            disabled={title === edition.title || metaMutation.isPending}
          >
            Save
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerateAll.mutate()}
            disabled={regenerateAll.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {regenerateAll.isPending ? "Regenerating…" : "Regenerate all AI blocks"}
          </Button>

          {edition.status === "draft" || edition.status === "unpublished" ? (
            <Button size="sm" onClick={() => transitionMutation.mutate("submit")}>
              Submit for review
            </Button>
          ) : null}
          {edition.status === "review" ? (
            <>
              <Button
                size="sm"
                onClick={() => transitionMutation.mutate("publish")}
                disabled={!data.permissions.canPublish}
              >
                Publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => transitionMutation.mutate("return_to_draft")}
              >
                Return to draft
              </Button>
            </>
          ) : null}
          {edition.status === "published" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => transitionMutation.mutate("unpublish")}
            >
              Unpublish
            </Button>
          ) : null}
          {edition.status === "review" && !data.permissions.canPublish ? (
            <span className="text-xs text-muted-foreground">
              You created this edition — another publisher has to publish it.
            </span>
          ) : null}
        </div>

        {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

        <ul className="space-y-4">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              busy={regenerateOne.isPending}
              onMove={(direction) => move(index, direction)}
              onSave={(patch) => blockMutation.mutate({ blockId: block.id, patch })}
              onRegenerate={() => regenerateOne.mutate(block.id)}
              onGenerateImage={() => {
                setImageBlockId(block.id);
                imageMutation.mutate(block.id);
              }}
              generatingImage={imageMutation.isPending && imageBlockId === block.id}
              imageError={
                imageBlockId === block.id
                  ? ((imageMutation.error as Error | null)?.message ?? null)
                  : null
              }
              onDiscard={() => discardMutation.mutate(block.id)}
              onDelete={() => deleteMutation.mutate(block.id)}
            />
          ))}
        </ul>

        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addMutation.mutate("specific_content")}
          >
            Add content block
          </Button>
          <Button variant="outline" size="sm" onClick={() => addMutation.mutate("advertisement")}>
            Add advertisement slot
          </Button>
        </div>

        <div className="mt-8">
          <NewsletterTranslationsPanel
            newsletterId={id}
            blocks={blocks.map((block) => ({
              id: block.id,
              title: block.title,
              enabled: block.enabled,
            }))}
            contentUpdatedAt={edition.updated_at}
          />
        </div>

        <NewsletterSendPanel
          id={id}
          defaultSubject={edition.title}
          canSend={data.permissions.canSend}
          status={edition.status}
        />

        <NewsletterPreviewDialog id={id} open={previewOpen} onOpenChange={setPreviewOpen} />
      </div>
    </Shell>
  );
}
