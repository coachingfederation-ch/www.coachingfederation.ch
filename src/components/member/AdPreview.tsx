/**
 * Live preview of an ad in the three public formats: wide event banner,
 * square advert and newsletter block. Purely presentational — it renders the
 * wizard's current content so advertisers see roughly how their ad will look.
 */
import { ImageIcon } from "lucide-react";
import { Badge } from "@/design-system/icf-welcome-design-system-a835df";

export type AdPreviewFormat = "banner" | "square" | "newsletter";

export type AdPreviewContent = {
  advertiserName: string;
  headline: string;
  text: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string | null;
  logoUrl: string | null;
  sponsoredLabel: string;
};

function ImageSlot({ url, className }: { url: string | null; className: string }) {
  return url ? (
    <img src={url} alt="" className={`${className} object-cover`} />
  ) : (
    <div className={`${className} flex items-center justify-center bg-muted text-muted-foreground`}>
      <ImageIcon className="h-6 w-6" aria-hidden />
    </div>
  );
}

function LogoSlot({ url, name }: { url: string | null; name: string }) {
  return url ? (
    <img src={url} alt="" className="h-8 w-auto max-w-24 object-contain" />
  ) : (
    <span className="text-xs font-semibold text-muted-foreground">{name || "Logo"}</span>
  );
}

export function AdPreview({
  format,
  content,
  compact = false,
}: {
  format: AdPreviewFormat;
  content: AdPreviewContent;
  compact?: boolean;
}) {
  const host = content.ctaUrl.replace(/^https?:\/\//i, "").split("/")[0];
  const headline = content.headline || content.advertiserName || "—";

  if (format === "banner") {
    return (
      <div className="flex overflow-hidden rounded-2xl border border-border bg-card">
        <ImageSlot url={content.imageUrl} className="aspect-square w-1/3 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <LogoSlot url={content.logoUrl} name={content.advertiserName} />
            <Badge variant="secondary">{content.sponsoredLabel}</Badge>
          </div>
          <p className="font-heading text-lg leading-tight">{headline}</p>
          {!compact && content.text ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{content.text}</p>
          ) : null}
          <p className="text-sm font-semibold text-primary">
            {content.ctaLabel} {host ? `· ${host}` : ""}
          </p>
        </div>
      </div>
    );
  }

  if (format === "square") {
    return (
      <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-card">
        <ImageSlot url={content.imageUrl} className="aspect-video w-full" />
        <div className="grid gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <LogoSlot url={content.logoUrl} name={content.advertiserName} />
            <Badge variant="secondary">{content.sponsoredLabel}</Badge>
          </div>
          <p className="font-heading text-lg leading-tight">{headline}</p>
          {!compact && content.text ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">{content.text}</p>
          ) : null}
          <p className="text-sm font-semibold text-primary">{content.ctaLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow text-muted-foreground">{content.sponsoredLabel}</span>
          <LogoSlot url={content.logoUrl} name={content.advertiserName} />
        </div>
        <div className="mt-3 flex gap-4">
          <ImageSlot url={content.imageUrl} className="h-20 w-28 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="font-heading text-base leading-tight">{headline}</p>
            {!compact && content.text ? (
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{content.text}</p>
            ) : null}
            <p className="mt-2 text-sm font-semibold text-primary">{content.ctaLabel} →</p>
          </div>
        </div>
      </div>
    </div>
  );
}
