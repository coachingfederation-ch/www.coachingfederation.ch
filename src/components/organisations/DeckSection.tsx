/**
 * Interactive carousel showcasing key slides from the organisational partnership deck.
 * Exports: DeckSection. Rendered on the organisations landing page.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Mark } from "@/components/marks";
import { CARD_SHADOW } from "@/components/site-chrome";
import { DeckDownload } from "@/components/organisations/DeckDownload";
import { useI18n } from "@/i18n";

type Slide = {
  kicker?: string;
  title?: string;
  body?: string;
  stat?: string;
  statLabel?: string;
  quote?: string;
  bullets?: string[];
  source?: string;
};

/** A source entry is either plain text or a labelled external link. */
type SourceItem = string | { label: string; url?: string };

const sourceLabel = (s: SourceItem) => (typeof s === "string" ? s : s.label);
const sourceUrl = (s: SourceItem) => (typeof s === "string" ? undefined : s.url);

export function DeckSection() {
  const { t, tList } = useI18n();
  const slides = tList<Slide>("organisations.deck.slides");
  const sources = tList<{ group: string; items: SourceItem[] }>("organisations.deck.sources");
  const [index, setIndex] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const touchX = useRef<number | null>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  const count = slides.length;
  const go = useCallback(
    (next: number) => setIndex((i) => (count === 0 ? 0 : Math.min(Math.max(next, 0), count - 1))),
    [count],
  );

  useEffect(() => {
    const el = regionRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [go, index]);

  if (count === 0) return null;
  const slide = slides[index];

  return (
    // The deck now sits on the official Deep Blue hero band, with white
    // foreground text and light cards that keep the slide content readable.
    <section className="bg-hero py-24 text-hero-foreground">
      <div className="mx-auto max-w-7xl px-8">
        <p className="eyebrow !text-hero-foreground">{t("organisations.deck.eyebrow")}</p>
        <h2 className="mt-3 max-w-2xl display-lg">{t("organisations.deck.title")}</h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-hero-foreground/90">
          {t("organisations.deck.lede")}
        </p>

        <div
          ref={regionRef}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label={t("organisations.deck.title")}
          className="mt-10 rounded-2xl border border-border/60 bg-secondary p-1 outline-none ring-primary/50 focus-visible:ring-2"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
            touchX.current = null;
          }}
        >
          <article
            aria-live="polite"
            className={
              "relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-xl bg-card p-8 text-foreground md:min-h-[440px] md:p-12 " +
              CARD_SHADOW
            }
          >
            <Mark
              name="circular1"
              className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 text-accent/35 md:h-64 md:w-64"
            />
            <div className="relative">
              {slide.kicker ? <p className="eyebrow">{slide.kicker}</p> : null}
              {slide.title ? (
                <h3 className="mt-3 max-w-3xl text-2xl font-bold leading-tight tracking-tight md:text-4xl">
                  {slide.title}
                </h3>
              ) : null}
              {slide.quote ? (
                <blockquote className="relative mt-6 max-w-3xl pl-8 text-2xl font-bold leading-tight tracking-tight text-primary md:pl-12 md:text-4xl">
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 text-6xl leading-none text-accent md:text-8xl"
                  >
                    “
                  </span>
                  {slide.quote}
                </blockquote>
              ) : null}
              {slide.body ? (
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
                  {slide.body}
                </p>
              ) : null}
              {slide.stat ? (
                <div className="relative mt-10 flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
                  <div className="relative shrink-0">
                    <Mark
                      name="circular2"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 text-accent/40"
                    />
                    <span className="relative block text-[5.5rem] font-bold leading-[0.85] tracking-tighter text-primary md:text-[9rem]">
                      {slide.stat}
                    </span>
                  </div>
                  <span className="max-w-sm text-lg font-semibold leading-snug tracking-tight text-foreground md:text-2xl">
                    {slide.statLabel}
                  </span>
                </div>
              ) : null}
              {slide.bullets && slide.bullets.length > 0 ? (
                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                  {slide.bullets.map((b, i) => (
                    <li
                      key={b}
                      className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-5 text-base font-medium leading-snug md:p-6"
                    >
                      <span className="btn-mono text-2xl font-bold leading-none text-primary md:text-3xl">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {slide.source ? (
              <p className="relative mt-8 text-xs font-medium text-foreground/70">{slide.source}</p>
            ) : null}
          </article>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                aria-current={i === index ? "true" : undefined}
                aria-label={`${t("organisations.deck.title")} ${i + 1} / ${count}`}
                onClick={() => go(i)}
                className={
                  "relative h-6 min-w-6 rounded-full px-1.5 transition-all before:absolute before:inset-x-1.5 before:top-1/2 before:h-1.5 before:-translate-y-1/2 before:rounded-full before:transition-all " +
                  (i === index
                    ? "w-10 before:bg-accent"
                    : "w-6 before:bg-hero-foreground/60 hover:before:bg-hero-foreground")
                }
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="btn-mono text-xs !text-hero-foreground">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hero-foreground/60 text-hero-foreground transition hover:bg-hero-foreground/15 disabled:opacity-40"
            >
              <span aria-hidden>←</span>
              <span className="sr-only">{t("organisations.deck.prev")}</span>
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === count - 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hero-foreground/60 text-hero-foreground transition hover:bg-hero-foreground/15 disabled:opacity-40"
            >
              <span aria-hidden>→</span>
              <span className="sr-only">{t("organisations.deck.next")}</span>
            </button>
          </div>
        </div>

        {sources.length > 0 ? (
          <div className="mt-10 border-t border-hero-foreground/35 pt-6">
            <button
              type="button"
              onClick={() => setShowSources((v) => !v)}
              aria-expanded={showSources}
              className="text-xs font-semibold uppercase tracking-wider text-hero-foreground transition hover:text-accent"
            >
              {t("organisations.deck.sourcesLabel")} {showSources ? "−" : "+"}
            </button>
            {showSources ? (
              <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {sources.map((g) => (
                  <div key={g.group}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-hero-foreground">
                      {g.group}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs leading-relaxed text-hero-foreground/90">
                      {g.items.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <DeckDownload />
      </div>
    </section>
  );
}
