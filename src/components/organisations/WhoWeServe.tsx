/**
 * Interactive "Who we serve" audience segment picker for the organisations landing page.
 * Exports: WhoWeServe, SEGMENT_IDS, type SegmentId. Selection is owned by ForOrganisations.
 */
import { useRef } from "react";
import { Mark, type MarkName } from "@/components/marks";
import { CARD_SHADOW } from "@/components/site-chrome";
import { useI18n } from "@/i18n";

export const SEGMENT_IDS = ["igo", "ngo", "gov", "commercial", "societal"] as const;
export type SegmentId = (typeof SEGMENT_IDS)[number];

type SegmentCopy = { label: string; definition: string; angle: string };

const segmentMarks: MarkName[] = ["circular1", "star", "asterisk1", "circular2", "asterisk3"];

export function WhoWeServe({
  selected,
  onSelect,
}: {
  selected: SegmentId | null;
  onSelect: (id: SegmentId | null) => void;
}) {
  const { t, tList } = useI18n();
  const items = tList<SegmentCopy>("organisations.segments.items");
  const stripRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  return (
    // Base surface: sits between the deck (base) and the raised "how we work" band.
    <section id="who-we-serve" className="scroll-mt-24 bg-background py-24">
      <div className="mx-auto max-w-7xl px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{t("organisations.segments.eyebrow")}</p>
            <h2 className="mt-3 max-w-3xl display-lg">{t("organisations.segments.title")}</h2>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={selected === null}
            className={
              "inline-flex h-10 shrink-0 items-center rounded-full border px-5 text-sm font-semibold transition " +
              (selected === null
                ? "border-primary bg-accent/10 text-primary"
                : "border-border hover:bg-muted")
            }
          >
            {t("organisations.segments.reset")}
          </button>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("organisations.segments.lede")}
        </p>

        <div
          ref={stripRef}
          role="group"
          aria-label={t("organisations.segments.eyebrow")}
          className="-mx-8 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-8 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-5"
        >
          {items.map((item, i) => {
            const id = SEGMENT_IDS[i];
            if (!id) return null;
            const active = selected === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(active ? null : id)}
                className={
                  "flex min-h-[248px] w-[78vw] shrink-0 snap-start flex-col rounded-2xl border p-6 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:w-[20rem] md:w-auto " +
                  (active
                    ? "border-primary bg-accent/10 "
                    : "border-border bg-card hover:-translate-y-0.5 ") +
                  CARD_SHADOW
                }
              >
                <span
                  className={
                    "grid h-11 w-11 place-items-center rounded-xl " +
                    (active ? "bg-primary/15 text-primary" : "bg-accent/15 text-primary")
                  }
                >
                  <Mark name={segmentMarks[i % segmentMarks.length]} className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-base font-semibold leading-snug tracking-tight">
                  {item.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.definition}
                </p>
                <p className="mt-4 text-xs leading-relaxed text-foreground/70">{item.angle}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
