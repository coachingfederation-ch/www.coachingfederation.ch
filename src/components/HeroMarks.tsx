/**
 * Renders hand-placed brush marks over a hero surface.
 * Exports: HeroMarks. Used by the public event hero and article cover, and by
 * the CMS hero designer preview so both look identical.
 */
import { Mark } from "@/components/marks";
import type { MarkPlacement, PlacedMark } from "@/lib/mark-placement";

export function HeroMarks({
  marks,
  placement,
  opacity = 1,
}: {
  marks: PlacedMark[];
  placement: MarkPlacement;
  opacity?: number;
}) {
  return (
    <>
      {marks.map((mark) => (
        <span
          key={mark.id}
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: `${mark.xPct}%`,
            top: `${mark.yPct}%`,
            width: `${mark.sizePct}%`,
            height: `${placement.heightPct(mark.sizePct)}%`,
            color: mark.color,
            opacity,
          }}
        >
          <Mark name={mark.name} className="h-full w-full" />
        </span>
      ))}
    </>
  );
}
