/**
 * LinkedIn flavour of the shared brush-mark canvas.
 * Exports: LinkedInMarkEditor. Rendered on top of the scaled card preview in
 * LinkedInShareCard.tsx; none of this chrome reaches the rasterised PNG.
 */
import { MarkPlacementCanvas, type MarkCanvasLabels } from "@/components/cms/MarkPlacementCanvas";
import { LINKEDIN_PLACEMENT, overlapsText } from "@/lib/linkedin-visuals";
import type { PlacedMark } from "@/lib/mark-placement";

export function LinkedInMarkEditor({
  marks,
  onChange,
  width,
  height,
  labels,
  children,
}: {
  marks: PlacedMark[];
  onChange: (next: PlacedMark[]) => void;
  width: number;
  height: number;
  children: React.ReactNode;
  labels: MarkCanvasLabels;
}) {
  return (
    <MarkPlacementCanvas
      marks={marks}
      onChange={onChange}
      placement={LINKEDIN_PLACEMENT}
      width={width}
      height={height}
      labels={labels}
      warnWhen={overlapsText}
    >
      {children}
    </MarkPlacementCanvas>
  );
}
