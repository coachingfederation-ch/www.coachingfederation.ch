/**
 * Image slot for one newsletter block.
 * Exports: BlockImageField. Consumed by the newsletter block editor.
 *
 * Mirrors the article editor's cover-image workflow: Unsplash search, an
 * upload from the computer, or a pasted URL. On top of that the picture can be
 * framed to one of the fixed layouts and decorated with ICF hand marks; the
 * result is flattened in the browser, because neither email clients nor the
 * public page can crop or overlay. AI generation is offered too and is always
 * disclosed — an AI image carries the badge here and everywhere it is
 * published, and the badge is not removable.
 */
import { useEffect, useState } from "react";
import { Crop, ImagePlus, Sparkles, Upload, X } from "lucide-react";
import { UnsplashPicker } from "@/components/cms/UnsplashPicker";
import { ImageFrameEditor } from "@/components/cms/ImageFrameEditor";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_IMAGE_BUCKET, ARTICLE_IMAGE_TTL_SECONDS } from "@/lib/storage";
import { renderBlockImage } from "@/lib/block-image-render";
import {
  DEFAULT_BLOCK_ASPECT,
  blockImagePreset,
  sanitizeBlockCrop,
  sanitizeBlockMarks,
  type BlockImageAspect,
  type BlockImageCrop,
} from "@/lib/block-image";
import type { PlacedMark } from "@/lib/mark-placement";
import { AiBadge, Button, Input, Label } from "@/design-system/icf-welcome-design-system-a835df";
import type { NewsletterBlockRow } from "@/lib/newsletters";

export type BlockImagePatch = Pick<
  NewsletterBlockRow,
  | "featured_image_url"
  | "image_source"
  | "image_credit_name"
  | "image_credit_url"
  | "image_alt"
  | "image_original_url"
  | "image_aspect"
  | "image_crop"
  | "image_marks"
>;

export function BlockImageField({
  block,
  onSave,
  onGenerate,
  generating,
  generateError,
}: {
  block: NewsletterBlockRow;
  onSave: (patch: Partial<BlockImagePatch>) => void;
  onGenerate: () => void;
  generating: boolean;
  generateError: string | null;
}) {
  const [unsplashOpen, setUnsplashOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [framing, setFraming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [frameError, setFrameError] = useState<string | null>(null);

  const isAi = block.image_source === "ai";
  // Framing works off the untouched original when we have one; images saved
  // before framing existed fall back to the displayed picture.
  const source = block.image_original_url ?? block.featured_image_url;
  const preset = blockImagePreset(block.image_aspect);

  const [aspect, setAspect] = useState<BlockImageAspect>(
    (block.image_aspect as BlockImageAspect | null) ?? DEFAULT_BLOCK_ASPECT,
  );
  const [crop, setCrop] = useState<BlockImageCrop>(() => sanitizeBlockCrop(block.image_crop));
  const [marks, setMarks] = useState<PlacedMark[]>(() =>
    sanitizeBlockMarks(block.image_aspect, block.image_marks),
  );

  // A newly picked, uploaded or generated image restarts from stored framing.
  useEffect(() => {
    setAspect((block.image_aspect as BlockImageAspect | null) ?? DEFAULT_BLOCK_ASPECT);
    setCrop(sanitizeBlockCrop(block.image_crop));
    setMarks(sanitizeBlockMarks(block.image_aspect, block.image_marks));
    setFrameError(null);
  }, [source, block.image_aspect, block.image_crop, block.image_marks]);

  const signedUpload = async (path: string, body: Blob | File, contentType: string) => {
    const { error } = await supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .upload(path, body, { upsert: true, contentType });
    if (error) throw error;
    const { data: signed, error: signError } = await supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .createSignedUrl(path, ARTICLE_IMAGE_TTL_SECONDS);
    if (signError || !signed) throw signError ?? new Error("Could not create an image link.");
    return signed.signedUrl as string;
  };

  const upload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `newsletters/${block.newsletter_id}/${block.id}-${Date.now()}.${ext}`;
    try {
      // Bytes stay on the browser client; storage RLS is the boundary.
      const url = await signedUpload(path, file, file.type);
      onSave({
        featured_image_url: url,
        image_original_url: url,
        image_source: "upload",
        image_credit_name: null,
        image_credit_url: null,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  /** Bake crop + marks into one file so email and web show the same picture. */
  const applyFraming = async () => {
    if (!source) return;
    setFrameError(null);
    setApplying(true);
    try {
      const blob = await renderBlockImage({
        sourceUrl: source,
        preset: blockImagePreset(aspect),
        crop,
        marks,
      });
      const path = `newsletters/${block.newsletter_id}/${block.id}-framed-${Date.now()}.jpg`;
      const url = await signedUpload(path, blob, "image/jpeg");
      onSave({
        featured_image_url: url,
        image_original_url: source,
        image_aspect: aspect,
        image_crop: crop,
        image_marks: marks,
      });
      setFraming(false);
    } catch (error) {
      setFrameError(
        error instanceof Error && error.message === "cors"
          ? "This image host does not allow cropping. Upload the file instead."
          : error instanceof Error
            ? error.message
            : "Could not apply the framing.",
      );
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Block image</Label>

      {block.featured_image_url ? (
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <img
            src={block.featured_image_url}
            alt={block.image_alt ?? ""}
            width={preset.width}
            height={preset.height}
            className="w-full object-cover"
          />
          {isAi ? <AiBadge className="absolute bottom-3 left-3" /> : null}
          <button
            type="button"
            onClick={() =>
              onSave({
                featured_image_url: null,
                image_original_url: null,
                image_source: null,
                image_credit_name: null,
                image_credit_url: null,
                image_alt: null,
                image_crop: null,
                image_marks: null,
              })
            }
            aria-label="Remove block image"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-soft hover:bg-card"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60">
          <ImagePlus className="h-6 w-6" />
          <span className="text-sm font-medium">
            {uploading ? "Uploading…" : "Upload an image"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
      )}

      {block.image_credit_name ? (
        <p className="text-xs text-muted-foreground">
          Photo by{" "}
          <a
            href={block.image_credit_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {block.image_credit_name}
          </a>{" "}
          on Unsplash
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          placeholder="…or paste an image URL"
          className="min-w-48 flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!urlDraft.trim()}
          onClick={() => {
            onSave({
              featured_image_url: urlDraft.trim(),
              image_original_url: urlDraft.trim(),
              image_source: "url",
              image_credit_name: null,
              image_credit_url: null,
            });
            setUrlDraft("");
          }}
        >
          Use URL
        </Button>
        <Button variant="outline" size="sm" onClick={() => setUnsplashOpen(true)}>
          Search Unsplash
        </Button>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={generating}>
          <Sparkles className="h-4 w-4" />
          {generating ? "Generating…" : "Generate AI image"}
        </Button>
        {source ? (
          <Button variant="outline" size="sm" onClick={() => setFraming((open) => !open)}>
            <Crop className="h-4 w-4" />
            {framing ? "Close framing" : "Crop & marks"}
          </Button>
        ) : null}
      </div>

      {framing && source ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <ImageFrameEditor
            sourceUrl={source}
            aspect={aspect}
            crop={crop}
            marks={marks}
            onAspectChange={setAspect}
            onCropChange={setCrop}
            onMarksChange={setMarks}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => void applyFraming()} disabled={applying}>
              {applying ? "Applying…" : "Apply framing"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFraming(false)}>
              Cancel
            </Button>
          </div>
          {frameError ? <p className="text-xs text-destructive">{frameError}</p> : null}
        </div>
      ) : null}

      {block.featured_image_url ? (
        <div className="space-y-1">
          <Label htmlFor={`alt-${block.id}`}>Image alt text</Label>
          <Input
            id={`alt-${block.id}`}
            defaultValue={block.image_alt ?? ""}
            onBlur={(event) => {
              const next = event.target.value.trim() || null;
              if (next !== (block.image_alt ?? null)) onSave({ image_alt: next });
            }}
            placeholder="Describe the image for screen readers"
          />
        </div>
      ) : null}

      {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
      {generateError ? <p className="text-xs text-destructive">{generateError}</p> : null}

      <UnsplashPicker
        open={unsplashOpen}
        onOpenChange={setUnsplashOpen}
        onPick={(pick) =>
          onSave({
            featured_image_url: pick.url,
            image_original_url: pick.url,
            image_source: "unsplash",
            image_credit_name: pick.creditName,
            image_credit_url: pick.creditUrl,
          })
        }
      />
    </div>
  );
}
