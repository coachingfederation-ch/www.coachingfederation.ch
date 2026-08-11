/**
 * The visual layer of the public event hero.
 * Exports: EventHeroSurface, type EventHeroMetaItem.
 *
 * Rendered by the public event page and — at a fixed 1200px width, scaled
 * down — by the CMS hero designer, so the preview an author places brush
 * marks on cannot drift from what visitors actually see.
 */
import type { LucideIcon } from "lucide-react";

export type EventHeroMetaItem = { id: string; icon: LucideIcon; label: string };

export function EventHeroSurface({
  title,
  summary,
  imageUrl,
  meta,
  pills,
  back,
  credit,
  titleUnderline,
  children,
}: {
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  meta: EventHeroMetaItem[];
  pills: string[];
  /** Back-to-events affordance; a real link on the public page. */
  back?: React.ReactNode;
  credit?: React.ReactNode;
  /** Automatic brush underline, rendered under the title when present. */
  titleUnderline?: React.ReactNode;
  /** Mark layer (automatic or hand-placed). */
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-hero text-hero-foreground">
      {/*
       * Cover image as atmosphere: the photo is decorative (the title is
       * the accessible name of the page), and the Deep Blue wash above it
       * keeps white text above AA at every width — near-solid on mobile,
       * where the text spans the full column.
       */}
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 -z-10 bg-hero/80 md:bg-gradient-to-r md:from-hero/90 md:via-hero/80 md:to-hero/40"
            aria-hidden
          />
        </>
      ) : null}
      {children}
      <div className={"relative mx-auto max-w-5xl px-8 pt-4 " + (imageUrl ? "pb-24" : "pb-16")}>
        {back}
        <div className="relative mt-6 max-w-3xl">
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">{title}</h1>
          {titleUnderline}
        </div>
        {summary ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-hero-foreground/85">
            {summary}
          </p>
        ) : null}
        {meta.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {meta.map(({ id, icon: Icon, label }) => (
              <span key={id} className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {pills.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {pills.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full border border-hero-foreground/30 px-3 py-1 text-xs font-semibold text-hero-foreground/85"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {credit ? <div className="mt-10 text-right">{credit}</div> : null}
      </div>
    </section>
  );
}
