/**
 * A LinkedIn-shaped feed mockup of the recap post.
 * Exports: LinkedInPostPreview. Rendered in RecapPostEditor.tsx.
 *
 * Purely presentational: it shows the commentary and the ordered carousel the
 * publisher has assembled, so nobody has to imagine what the page will look
 * like. It is a mockup of a third-party surface, not a chapter surface, which
 * is why the frame uses neutral design-system tokens rather than brand bands.
 */
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import icfLogo from "@/assets/icf-switzerland-charter-chapter.png.asset.json";

export type PreviewSlide = {
  id: string;
  src: string | null;
  alt: string;
  /** Slide artwork is still being rasterised (branded cover). */
  pending?: boolean;
};

export function LinkedInPostPreview({
  commentary,
  slides,
  pageName,
  labels,
}: {
  commentary: string;
  slides: PreviewSlide[];
  pageName: string;
  labels: { empty: string; slideOf: string; previous: string; next: string; rendering?: string };
}) {
  const [index, setIndex] = useState(0);
  const current = slides[Math.min(index, Math.max(slides.length - 1, 0))];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <img src={icfLogo.url} alt="" className="h-10 w-10 rounded-full bg-hero object-contain p-1" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{pageName}</p>
          <p className="text-xs text-muted-foreground">The Switzerland Chapter of ICF</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap px-4 pb-4 text-sm">
        {commentary.trim() || <span className="text-muted-foreground">{labels.empty}</span>}
      </p>

      {slides.length > 0 ? (
        <div className="relative aspect-square w-full bg-secondary">
          {current?.src ? (
            <img src={current.src} alt={current.alt} className="h-full w-full object-cover" />
          ) : current?.pending ? (
            <div className="flex h-full w-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {labels.rendering}
            </div>
          ) : null}
          {slides.length > 1 ? (
            <>
              <button
                type="button"
                aria-label={labels.previous}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={labels.next}
                onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
                className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="absolute bottom-3 end-3 rounded-full bg-hero px-3 py-1 text-xs font-semibold text-hero-foreground">
                {labels.slideOf
                  .replace("{index}", String(Math.min(index, slides.length - 1) + 1))
                  .replace("{total}", String(slides.length))}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
