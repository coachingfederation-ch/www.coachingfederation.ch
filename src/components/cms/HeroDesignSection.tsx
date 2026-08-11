/**
 * Hero designer for the article and event editors.
 * Exports: HeroDesignSection.
 *
 * The author picks a background image (the controls are passed in, so each
 * editor keeps its own upload / Unsplash / URL affordances) and then places
 * brush marks directly on a scaled preview of the hero. Placement is stored in
 * percentages, so the public hero reproduces the arrangement exactly.
 */
import { HeroMarks } from "@/components/HeroMarks";
import { MarkPlacementCanvas } from "@/components/cms/MarkPlacementCanvas";
import { heroPlacement, type HeroKind } from "@/lib/hero-design";
import type { PlacedMark } from "@/lib/mark-placement";

const PREVIEW_WIDTH = 560;

export function HeroDesignSection({
  kind,
  imageUrl,
  title,
  summary,
  marks,
  onChange,
  t,
  children,
}: {
  kind: HeroKind;
  imageUrl: string | null;
  title: string;
  summary?: string | null;
  marks: PlacedMark[];
  onChange: (next: PlacedMark[]) => void;
  t: (k: string) => string;
  /** Image source controls owned by the host editor. */
  children: React.ReactNode;
}) {
  const placement = heroPlacement(kind);
  const height = (PREVIEW_WIDTH * placement.height) / placement.width;

  return (
    <div className="space-y-5">
      {children}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{t("hero.previewLabel")}</p>
        <MarkPlacementCanvas
          marks={marks}
          onChange={onChange}
          placement={placement}
          width={PREVIEW_WIDTH}
          height={height}
          labels={{
            palette: t("hero.palette"),
            limit: t("hero.limit"),
            overlap: t("hero.overlap"),
            remove: t("hero.remove"),
            colour: t("hero.colour"),
          }}
        >
          <div className="absolute inset-0 bg-hero text-hero-foreground">
            {imageUrl ? (
              <>
                <img src={imageUrl} alt="" aria-hidden className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-hero/70" aria-hidden />
              </>
            ) : null}
            <div className="absolute inset-0 flex flex-col justify-end gap-1 p-5">
              <p className="max-w-[62%] text-lg font-bold leading-tight text-hero-foreground">
                {title || t("hero.untitled")}
              </p>
              {summary ? (
                <p className="max-w-[62%] truncate text-xs text-hero-foreground/80">{summary}</p>
              ) : null}
            </div>
          </div>
          <HeroMarks marks={marks} placement={placement} />
        </MarkPlacementCanvas>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">{t("hero.hint")}</p>
          {marks.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-secondary"
            >
              {t("hero.clear")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
