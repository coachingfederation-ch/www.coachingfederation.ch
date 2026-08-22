/**
 * Page-level compositions ported from the ICF site, kept imagery-free: hero
 * band, pillar cards, chip/filter row, callouts and the CSS-only marquee.
 *
 * Brush marks are the one piece of artwork the system carries. They are always
 * decorative here: masked, token-tinted and aria-hidden, so they add the
 * handmade layer without adding meaning a screen reader has to announce.
 */
import * as React from "react";
import { Callout } from "@/design-system/icf-welcome-design-system-a835df/components/callout";
import { BrushMark } from "@/design-system/icf-welcome-design-system-a835df/components/brush/BrushMark";
import { PILLARS } from "@/design-system/icf-welcome-design-system-a835df/lib/design-tokens";

export function CompactHero({
  eyebrow,
  title,
  lede,
  ctaLabel,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede: string;
  ctaLabel?: string;
}) {
  return (
    <header className="relative overflow-hidden bg-hero text-hero-foreground">
      {/* Oversized mark bleeding off the band edge — the hero's brush texture. */}
      <BrushMark
        name="Other06"
        className="absolute -right-24 top-6 h-40 text-white/[0.07] sm:h-56"
      />
      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-8">
        <div className="max-w-3xl">
          <p className="eyebrow-accent flex items-center gap-2">
            <BrushMark name="Asterisk02" className="h-3.5 text-accent" />
            {eyebrow}
          </p>
          <h1 className="display-xl mt-4">{title}</h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-white/85">{lede}</p>
          {ctaLabel && (
            <div className="mt-9">
              <span className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground">
                {ctaLabel} →
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function PillarCards() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {PILLARS.map((pillar) => (
        <article
          key={pillar.key}
          className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-soft"
        >
          <div className={`h-2 w-full ${pillar.className}`} aria-hidden="true" />
          <div className="flex flex-1 flex-col p-6">
            <p className="section-label">Pillar {pillar.key.toUpperCase()}</p>
            <h3 className="mt-2 text-xl">{pillar.label}</h3>
            <p className="mt-3 text-[15px] leading-[1.65] text-muted-foreground">{pillar.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

const CHIPS = ["All regions", "Zürich", "Genève", "Ticino", "Basel", "Bern"];

export function ChipRow() {
  const [active, setActive] = React.useState(CHIPS[0]);
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map((chip) => {
        const isActive = chip === active;
        return (
          <button
            key={chip}
            type="button"
            aria-pressed={isActive}
            onClick={() => setActive(chip)}
            className={
              "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold text-chip-foreground transition " +
              (isActive
                ? "border-chip-active-border bg-chip"
                : "border-border bg-card hover:border-chip-active-border/60")
            }
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
}

export function CalloutSet() {
  return (
    <div className="grid gap-4">
      <Callout shade="info" emoji="ℹ️">
        <p>Informational callout — uses the teal token family with a solid left rail.</p>
      </Callout>
      <Callout shade="highlight" emoji="⭐">
        <p>Highlight callout — the ICF yellow mark colour carries the emphasis.</p>
      </Callout>
      <Callout shade="warning" emoji="⚠️">
        <p>Warning callout — destructive tokens at low opacity keep the page calm.</p>
      </Callout>
    </div>
  );
}

const MARQUEE_ITEMS = [
  { name: "Chapter Partner", category: "Partnership", claim: "Supporting credentialed coaching." },
  { name: "Regional Host", category: "Community", claim: "Local events across six regions." },
  { name: "Learning Partner", category: "Education", claim: "Continuing coach education hours." },
  { name: "Research Circle", category: "Insights", claim: "Evidence for the coaching profession." },
];

export function Marquee() {
  return (
    <div
      className="group relative overflow-hidden motion-reduce:overflow-x-auto"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div className="marquee-track flex w-max items-stretch gap-5 group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex items-stretch gap-5"
            aria-hidden={copy === 1 || undefined}
          >
            {MARQUEE_ITEMS.map((item) => (
              <article
                key={item.name}
                className="flex w-[17rem] shrink-0 flex-col rounded-3xl border border-white/10 bg-hero p-7 text-hero-foreground"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-[2px] w-4 bg-accent" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
                    {item.category}
                  </p>
                </div>
                <h3 className="mt-3 font-display text-2xl leading-tight">{item.name}</h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-white/75">{item.claim}</p>
              </article>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
