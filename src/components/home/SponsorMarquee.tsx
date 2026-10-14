/**
 * Homepage advertising band.
 *
 * A CSS-only marquee: the card track is rendered twice and translated by -50%,
 * so the loop is seamless without JS. Motion pauses on hover/focus and is
 * disabled entirely under `prefers-reduced-motion`, where the band degrades to
 * a plain horizontally scrollable row.
 *
 * Content is either live approved placements (see `listActivePlacements`) or,
 * when none are live, the demo entries in `home.ads`. Imagery is decorative, so
 * it carries an empty alt and the partner name carries the meaning. Only the
 * demo photographs are AI generated, so the mandatory disclosure badge is bound
 * to `item.ai` rather than to the presence of an image — a real advertiser logo
 * must never be labelled as generated.
 */
import { AiBadge } from "@/design-system/icf-welcome-design-system-a835df";

export type SponsorItem = {
  name: string;
  category: string;
  claim: string;
  /** Bundled demo image or advertiser logo; decorative only. */
  image?: string;
  /** True only for the AI-generated demo photography. */
  ai?: boolean;
  /** Advertiser link; the whole card becomes a link when present. */
  href?: string;
};

function SponsorCard({
  item,
  cta,
  adLabel,
  aiLabel,
}: {
  item: SponsorItem;
  cta: string;
  adLabel: string;
  aiLabel: string;
}) {
  return (
    <article className="group/card relative flex h-full w-[19rem] shrink-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-hero text-hero-foreground shadow-soft sm:w-[21rem]">
      <div className="relative h-44 w-full overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            width={1088}
            height={608}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
          />
        ) : null}
        {/* Fade the photo into the card instead of ending on a hard edge. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-hero via-hero/10 to-transparent" />
        {item.ai ? <AiBadge label={aiLabel} className="absolute bottom-3 left-4" /> : null}
        <span className="absolute right-4 top-4 inline-flex items-center rounded-md bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
          {adLabel}
        </span>
      </div>

      {item.href ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="absolute inset-0 z-10 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="sr-only">{`${cta} — ${item.name}`}</span>
        </a>
      ) : null}
      <div className="relative flex flex-1 flex-col p-7">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="h-[2px] w-4 bg-accent" />
          <p className="eyebrow-accent">
            {item.category}
          </p>
        </div>
        <h3 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight">
          {item.name}
        </h3>
        <p className="mt-3 text-[15px] leading-[1.65] text-white/75">{item.claim}</p>
        <span className="mt-auto flex items-center gap-3 pt-7 text-sm font-bold">
          <span className="relative">
            {cta}
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-[2px] w-0 bg-accent transition-all duration-300 group-hover/card:w-full"
            />
          </span>
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/25 transition-colors duration-300 group-hover/card:border-accent"
          >
            →
          </span>
        </span>
      </div>
    </article>
  );
}

export function SponsorMarquee({
  items,
  adLabel,
  cta,
  aiLabel,
}: {
  items: SponsorItem[];
  adLabel: string;
  cta: string;
  aiLabel: string;
}) {
  return (
    <div
      className="group relative overflow-hidden motion-reduce:overflow-x-auto"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div className="marquee-track flex w-max items-stretch gap-5 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex items-stretch gap-5"
            aria-hidden={copy === 1 || undefined}
          >
            {items.map((item) => (
              <div key={item.name} className="flex">
                <SponsorCard item={item} cta={cta} adLabel={adLabel} aiLabel={aiLabel} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
