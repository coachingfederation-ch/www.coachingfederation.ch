/**
 * Structural sections for the "For Organisations" landing page, covering proof points and initiatives.
 * Exports: ProofBar, Differentiators, Initiatives, EventsStrip. Rendered by the organisations landing route.
 */
import { Mark, type MarkName } from "@/components/marks";
import { AnimatedStat } from "@/components/organisations/AnimatedStat";
import { CARD_SHADOW } from "@/components/site-chrome";
import { LocaleLink, useI18n } from "@/i18n";

export function ProofBar() {
  const { tList } = useI18n();
  const items = tList<{ value: string; label: string }>("organisations.proof.items");
  if (items.length === 0) return null;
  return (
    <section className="border-b border-border/60 bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-8 py-10 md:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="px-2">
            <AnimatedStat
              value={i.value}
              className="text-2xl font-bold tracking-tight text-primary md:text-3xl"
            />
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{i.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const whyMarks: MarkName[] = ["circular1", "star", "asterisk1", "circular2", "asterisk3", "arrow1"];

export function Differentiators() {
  const { t, tList } = useI18n();
  const items = tList<{ title: string; desc: string }>("organisations.why.items");
  return (
    // Raised surface: card/list section (see the surface rhythm in project knowledge).
    <section className="bg-card py-24">
      <div className="mx-auto max-w-7xl px-8">
        <p className="eyebrow">{t("organisations.why.eyebrow")}</p>
        <h2 className="mt-3 max-w-2xl display-lg">{t("organisations.why.title")}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("organisations.why.lede")}
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            // Card on a raised (white) band: full-strength border so the edge stays legible.
            <div
              key={item.title}
              className={"rounded-2xl border border-border bg-card p-7 " + CARD_SHADOW}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-primary">
                <Mark name={whyMarks[i % whyMarks.length]} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const initiativeVisuals: { bg: string; fg: string; mark: MarkName }[] = [
  { bg: "bg-mark-indigo", fg: "text-mark-cream", mark: "circular2" },
  { bg: "bg-mark-yellow", fg: "text-mark-indigo", mark: "star" },
  { bg: "bg-mark-cream", fg: "text-mark-indigo", mark: "asterisk3" },
];

export function Initiatives({ contextLine }: { contextLine?: string }) {
  const { t, tList } = useI18n();
  const items = tList<{ tag: string; title: string; desc: string; lead?: string; cta: string }>(
    "organisations.initiatives.items",
  );
  return (
    // Base surface: soft lavender page background.
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-8">
        <p className="eyebrow">{t("organisations.initiatives.eyebrow")}</p>
        <h2 className="mt-3 max-w-2xl display-lg">{t("organisations.initiatives.title")}</h2>
        {/* Reserved slot keeps the grid from shifting when a segment is selected. */}
        <p
          aria-live="polite"
          className="mt-4 min-h-[1.25rem] text-sm font-semibold leading-relaxed text-primary"
        >
          {contextLine ?? ""}
        </p>
        <div className="mt-10 space-y-6">
          {items.map((item, i) => {
            const v = initiativeVisuals[i % initiativeVisuals.length];
            return (
              <article
                key={item.title}
                className={
                  "grid gap-0 overflow-hidden rounded-2xl border border-border/70 bg-card md:grid-cols-[1fr_280px] " +
                  CARD_SHADOW
                }
              >
                <div className="p-8 md:p-10">
                  <p className="section-label">{item.tag}</p>
                  <h3 className="mt-3 max-w-xl text-xl font-semibold leading-snug tracking-tight md:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                  {item.lead ? (
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">
                      {item.lead}
                    </p>
                  ) : null}
                  <a
                    href="#organisation-contact"
                    className="mt-6 inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-muted"
                  >
                    {item.cta} →
                  </a>
                </div>
                <div
                  className={
                    "order-first grid aspect-[16/7] w-full place-items-center md:order-last md:aspect-auto " +
                    v.bg +
                    " " +
                    v.fg
                  }
                >
                  <Mark name={v.mark} className="h-24 w-24 md:h-32 md:w-32" />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function EventsStrip() {
  const { t, tList } = useI18n();
  const items = tList<{ date: string; title: string; desc: string }>("organisations.events.items");
  return (
    // Raised surface: card/list section.
    <section className="bg-card py-24">
      <div className="mx-auto max-w-7xl px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{t("organisations.events.eyebrow")}</p>
            <h2 className="mt-3 display-lg">{t("organisations.events.title")}</h2>
          </div>
          <LocaleLink
            to="/events"
            className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-muted"
          >
            {t("organisations.events.cta")} →
          </LocaleLink>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((e) => (
            <div
              key={e.title}
              className={"rounded-2xl border border-border bg-card p-6 " + CARD_SHADOW}
            >
              <p className="btn-mono text-xs font-bold !text-teal-foreground">{e.date}</p>
              <h3 className="mt-3 text-sm font-semibold leading-snug tracking-tight">{e.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{e.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
