/**
 * Framing + brush-mark editor for one newsletter block image.
 * Exports: ImageFrameEditor. Consumed by BlockImageField.
 *
 * The frame is a fixed-ratio window from BLOCK_IMAGE_PRESETS. The source image
 * is dragged and zoomed behind it, and ICF hand marks are placed on top with
 * the shared MarkPlacementCanvas. Geometry is percentage based, so this preview
 * and the flattened export in block-image-render.ts agree exactly.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MarkPlacementCanvas } from "@/components/cms/MarkPlacementCanvas";
import { drawGeometry } from "@/lib/block-image-render";
import {
  BLOCK_IMAGE_PRESETS,
  MAX_BLOCK_ZOOM,
  blockImagePlacement,
  blockImagePreset,
  type BlockImageAspect,
  type BlockImageCrop,
} from "@/lib/block-image";
import type { PlacedMark } from "@/lib/mark-placement";
import { Button, Label, Slider } from "@/design-system/icf-welcome-design-system-a835df";

/** Preview width in CSS pixels; the frame keeps the preset's ratio. */
const PREVIEW_WIDTH = 420;

export function ImageFrameEditor({
  sourceUrl,
  aspect,
  crop,
  marks,
  onAspectChange,
  onCropChange,
  onMarksChange,
}: {
  sourceUrl: string;
  aspect: BlockImageAspect;
  crop: BlockImageCrop;
  marks: PlacedMark[];
  onAspectChange: (next: BlockImageAspect) => void;
  onCropChange: (next: BlockImageCrop) => void;
  onMarksChange: (next: PlacedMark[]) => void;
}) {
  const preset = blockImagePreset(aspect);
  const placement = blockImagePlacement(aspect);
  const scale = PREVIEW_WIDTH / preset.width;
  const width = PREVIEW_WIDTH;
  const height = Math.round(preset.height * scale);


  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; crop: BlockImageCrop } | null>(null);

  const geo = natural
    ? drawGeometry(natural.w, natural.h, { width, height }, crop)
    : { x: 0, y: 0, width, height };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, crop };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !natural) return;
    // Dragging moves the picture, so the crop centre moves the opposite way.
    const drawn = drawGeometry(natural.w, natural.h, { width, height }, drag.crop);
    const dx = ((event.clientX - drag.x) / drawn.width) * 100;
    const dy = ((event.clientY - drag.y) / drawn.height) * 100;
    onCropChange({
      ...drag.crop,
      xPct: Math.min(100, Math.max(0, drag.crop.xPct - dx)),
      yPct: Math.min(100, Math.max(0, drag.crop.yPct - dy)),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Layout</span>
        {BLOCK_IMAGE_PRESETS.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={option.id === aspect ? "default" : "outline"}
            onClick={() => onAspectChange(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <MarkPlacementCanvas
        marks={marks}
        onChange={onMarksChange}
        placement={placement}
        width={width}
        height={height}
        labels={{
          palette: "Marks",
          limit: "max. three",
          overlap: "This mark covers the image subject.",
          remove: "Remove mark",
          colour: "Mark colour",
        }}
      >
        <div
          className="absolute inset-0 cursor-grab touch-none bg-secondary active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <img
            src={sourceUrl}
            alt=""
            crossOrigin="anonymous"
            draggable={false}
            onLoad={(event) =>
              setNatural({
                w: event.currentTarget.naturalWidth,
                h: event.currentTarget.naturalHeight,
              })
            }
            style={{
              position: "absolute",
              left: geo.x,
              top: geo.y,
              width: geo.width,
              height: geo.height,
              maxWidth: "none",
            }}
          />
        </div>
        {/*
         * The canvas only draws selection chrome; the artwork itself belongs to
         * the preview, exactly as the LinkedIn card renders its own marks. Kept
         * pointer-transparent so the chrome above stays draggable.
         */}
        {marks.map((mark) => (
          <Mark
            key={mark.id}
            name={mark.name}
            className="pointer-events-none absolute"
            style={{
              left: `${mark.xPct}%`,
              top: `${mark.yPct}%`,
              width: `${mark.sizePct}%`,
              height: `${placement.heightPct(mark.sizePct)}%`,
              color: mark.color,
            }}
          />
        ))}
      </MarkPlacementCanvas>


      <div className="space-y-1">
        <Label htmlFor="block-image-zoom">Zoom</Label>
        <Slider
          id="block-image-zoom"
          min={1}
          max={MAX_BLOCK_ZOOM}
          step={0.05}
          value={[crop.zoom]}
          onValueChange={([value]) => onCropChange({ ...crop, zoom: value ?? 1 })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Drag the picture to reframe it. The final image is saved at {preset.width}×{preset.height}
        {" pixels, so email clients show exactly this crop."}
      </p>
    </div>
  );
}
