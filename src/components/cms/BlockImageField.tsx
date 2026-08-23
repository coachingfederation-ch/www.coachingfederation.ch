/**
 * Image slot for one newsletter block.
 * Exports: BlockImageField. Consumed by the newsletter block editor.
 *
 * Mirrors the article editor's cover-image workflow: Unsplash search, an
 * upload from the computer, or a pasted URL. AI generation is offered too and
 * is always disclosed — an AI image carries the badge here and everywhere it
 * is published, and the badge is not removable.
 */
import { useState } from "react";
import { ImagePlus, Sparkles, Upload, X } from "lucide-react";
import { UnsplashPicker } from "@/components/cms/UnsplashPicker";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_IMAGE_BUCKET, ARTICLE_IMAGE_TTL_SECONDS } from "@/lib/storage";
import {
  AiBadge,
  Button,
  Input,
  Label,
} from "@/design-system/icf-welcome-design-system-a835df";
import type { NewsletterBlockRow } from "@/lib/newsletters";

export type BlockImagePatch = Pick<
  NewsletterBlockRow,
  "featured_image_url" | "image_source" | "image_credit_name" | "image_credit_url" | "image_alt"
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

  const isAi = block.image_source === "ai";

  const upload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `newsletters/${block.newsletter_id}/${block.id}-${Date.now()}.${ext}`;
    // Bytes stay on the browser client; storage RLS is the boundary.
    const { error } = await supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data: signed, error: signError } = await supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .createSignedUrl(path, ARTICLE_IMAGE_TTL_SECONDS);
    setUploading(false);
    if (signError || !signed) {
      setUploadError(signError?.message ?? "Could not create an image link.");
      return;
    }
    onSave({
      featured_image_url: signed.signedUrl,
      image_source: "upload",
      image_credit_name: null,
      image_credit_url: null,
    });
  };

  return (
    <div className="space-y-3">
      <Label>Block image</Label>

      {block.featured_image_url ? (
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <img
            src={block.featured_image_url}
            alt={block.image_alt ?? ""}
            className="h-48 w-full object-cover"
          />
          {isAi ? <AiBadge className="absolute bottom-3 left-3" /> : null}
          <button
            type="button"
            onClick={() =>
              onSave({
                featured_image_url: null,
                image_source: null,
                image_credit_name: null,
                image_credit_url: null,
                image_alt: null,
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
      </div>

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
            image_source: "unsplash",
            image_credit_name: pick.creditName,
            image_credit_url: pick.creditUrl,
          })
        }
      />
    </div>
  );
}
