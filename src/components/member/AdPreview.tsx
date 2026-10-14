/**
 * Live preview of an ad in the three public formats (wide event banner,
 * square advert, newsletter block) and three styles the advertiser picks:
 * - editorial: white card, thin border, calm text link
 * - spotlight: Deep Blue band, on-dark button, Yellow "Sponsored" accent
 * - warm: bone surface, fully rounded image window, brush underline, pill
 * Purely presentational; tokens only.
 */
import type { ReactNode } from "react";
import { ImageIcon } from "lucide-react";
import { Badge, BrushMark, Button } from "@/design-system/icf-welcome-design-system-a835df";
import type { AdDesignVariant } from "@/lib/ads";

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

function LogoSlot({ url, name, onDark }: { url: string | null; name: string; onDark?: boolean }) {
  return url ? (
    <img src={url} alt="" className="h-8 w-auto max-w-24 object-contain" />
  ) : (
    <span
      className={`text-xs font-semibold ${onDark ? "text-hero-foreground" : "text-muted-foreground"}`}
    >
      {name || "Logo"}
    </span>
  );
}

/** Non-interactive button look: the preview must not be a fake control. */
function CtaPill({ label, variant }: { label: string; variant: "inverse" | "pill-ghost" }) {
  return (
    <Button asChild variant={variant} size="sm">
      <span aria-hidden>{label || "—"}</span>
    </Button>
  );
}

function WarmHeadline({ children, size }: { children: ReactNode; size: string }) {
  return (
    <p className={`font-heading ${size} leading-tight`}>
      <span className="relative inline-block">
        {children}
        <BrushMark
          name="stroke4"
          preserveRatio={false}
          className="pointer-events-none absolute inset-x-0 -bottom-1 h-2 w-full text-accent"
        />
      </span>
    </p>
  );
}

export function AdPreview({
  format,
  content,
  variant = "editorial",
  compact = false,
}: {
  format: AdPreviewFormat;
  content: AdPreviewContent;
  variant?: AdDesignVariant;
  compact?: boolean;
}) {
  const host = content.ctaUrl.replace(/^https?:\/\//i, "").split("/")[0];
  const headline = content.headline || content.advertiserName || "—";
  const body = !compact && content.text ? content.text : null;

  if (variant === "spotlight") {
    const sponsored = <span className="eyebrow eyebrow-accent">{content.sponsoredLabel}</span>;
    if (format === "banner") {
      return (
        <div className="flex overflow-hidden rounded-2xl bg-hero text-hero-foreground">
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <LogoSlot url={content.logoUrl} name={content.advertiserName} onDark />
              {sponsored}
            </div>
            <p className="font-heading text-xl leading-tight">{headline}</p>
            {body ? <p className="line-clamp-2 text-sm">{body}</p> : null}
            <div>
              <CtaPill label={content.ctaLabel} variant="inverse" />
            </div>
          </div>
          <ImageSlot url={content.imageUrl} className="w-2/5 shrink-0" />
        </div>
      );
    }
    if (format === "square") {
      return (
        <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-hero text-hero-foreground">
          <ImageSlot url={content.imageUrl} className="aspect-video w-full" />
          <div className="grid gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <LogoSlot url={content.logoUrl} name={content.advertiserName} onDark />
              {sponsored}
            </div>
            <p className="font-heading text-xl leading-tight">{headline}</p>
            {body ? <p className="line-clamp-3 text-sm">{body}</p> : null}
            <div>
              <CtaPill label={content.ctaLabel} variant="inverse" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center gap-4 rounded-xl bg-hero p-4 text-hero-foreground">
          <ImageSlot url={content.imageUrl} className="h-20 w-20 shrink-0 rounded-xl" />
          <div className="grid min-w-0 flex-1 gap-2">
            {sponsored}
            <p className="font-heading text-base leading-tight">{headline}</p>
            {body ? <p className="line-clamp-2 text-sm">{body}</p> : null}
          </div>
          <div className="hidden shrink-0 sm:block">
            <CtaPill label={content.ctaLabel} variant="inverse" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "warm") {
    const logo = (
      <span className="inline-flex items-center rounded-full bg-card px-3 py-1">
        <LogoSlot url={content.logoUrl} name={content.advertiserName} />
      </span>
    );
    const sponsored = <Badge variant="outline">{content.sponsoredLabel}</Badge>;
    if (format === "banner") {
      return (
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-background p-4">
          <ImageSlot url={content.imageUrl} className="aspect-square w-1/3 shrink-0 rounded-full" />
          <div className="grid min-w-0 flex-1 gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {logo}
              {sponsored}
            </div>
            <WarmHeadline size="text-xl">{headline}</WarmHeadline>
            {body ? <p className="line-clamp-2 text-sm text-muted-foreground">{body}</p> : null}
            <div>
              <CtaPill label={content.ctaLabel} variant="pill-ghost" />
            </div>
          </div>
        </div>
      );
    }
    if (format === "square") {
      return (
        <div className="mx-auto grid w-full max-w-xs gap-3 rounded-3xl border border-border bg-background p-4">
          <ImageSlot url={content.imageUrl} className="aspect-square w-full rounded-3xl" />
          <div className="flex items-center justify-between gap-2">
            {logo}
            {sponsored}
          </div>
          <WarmHeadline size="text-xl">{headline}</WarmHeadline>
          {body ? <p className="line-clamp-3 text-sm text-muted-foreground">{body}</p> : null}
          <div>
            <CtaPill label={content.ctaLabel} variant="pill-ghost" />
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 rounded-3xl bg-background p-4">
          <ImageSlot url={content.imageUrl} className="aspect-video w-full rounded-3xl" />
          <div className="flex items-center justify-between gap-2">
            {logo}
            {sponsored}
          </div>
          <WarmHeadline size="text-lg">{headline}</WarmHeadline>
          {body ? <p className="line-clamp-3 text-sm text-muted-foreground">{body}</p> : null}
          <div>
            <CtaPill label={content.ctaLabel} variant="pill-ghost" />
          </div>
        </div>
      </div>
    );
  }

  // Editorial
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
          {body ? <p className="line-clamp-2 text-sm text-muted-foreground">{body}</p> : null}
          <p className="text-sm font-semibold text-primary">
            {content.ctaLabel} →{" "}
            {host ? <span className="text-muted-foreground">· {host}</span> : null}
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
          {body ? <p className="line-clamp-3 text-sm text-muted-foreground">{body}</p> : null}
          <p className="text-sm font-semibold text-primary">{content.ctaLabel} →</p>
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
            {body ? (
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{body}</p>
            ) : null}
            <p className="mt-2 text-sm font-semibold text-primary">{content.ctaLabel} →</p>
          </div>
        </div>
      </div>
    </div>
  );
}
