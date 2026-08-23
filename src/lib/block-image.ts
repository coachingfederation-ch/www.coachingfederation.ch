/**
 * Layout presets and brush-mark placements for newsletter block images.
 * Exports: BLOCK_IMAGE_PRESETS, BlockImageAspect, BlockImageCrop,
 * blockImagePreset, blockImagePlacement, sanitizeBlockCrop, sanitizeBlockMarks.
 *
 * The newsletter body is 600px wide, so every preset renders at that width and
 * a fixed height. Framing is stored as a percentage offset plus a zoom factor,
 * and marks reuse the shared percentage model from mark-placement.ts, so the
 * editor preview and the flattened output always agree.
 */
import { createPlacement, type MarkPlacement, type PlacedMark } from "./mark-placement";

export const BLOCK_IMAGE_ASPECTS = ["banner", "landscape", "square", "portrait"] as const;
export type BlockImageAspect = (typeof BLOCK_IMAGE_ASPECTS)[number];

/** At most three marks per image (brand guide). */
export const BLOCK_MARK_LIMIT = 3;

export type BlockImagePreset = {
  id: BlockImageAspect;
  label: string;
  /** Rendered pixel size — width is the email body width, height is capped. */
  width: number;
  height: number;
};

export const BLOCK_IMAGE_PRESETS: BlockImagePreset[] = [
  { id: "banner", label: "Banner", width: 600, height: 200 },
  { id: "landscape", label: "Landscape", width: 600, height: 338 },
  { id: "square", label: "Square", width: 440, height: 440 },
  { id: "portrait", label: "Portrait", width: 390, height: 520 },
];

export const DEFAULT_BLOCK_ASPECT: BlockImageAspect = "landscape";

export function blockImagePreset(aspect: string | null | undefined): BlockImagePreset {
  return (
    BLOCK_IMAGE_PRESETS.find((p) => p.id === aspect) ??
    BLOCK_IMAGE_PRESETS.find((p) => p.id === DEFAULT_BLOCK_ASPECT)!
  );
}

const placements = new Map<BlockImageAspect, MarkPlacement>();

export function blockImagePlacement(aspect: string | null | undefined): MarkPlacement {
  const preset = blockImagePreset(aspect);
  const cached = placements.get(preset.id);
  if (cached) return cached;
  const placement = createPlacement({
    width: preset.width,
    height: preset.height,
    marginPx: 8,
    minSizePx: 48,
    maxSizePx: Math.round(preset.width * 0.6),
    limit: BLOCK_MARK_LIMIT,
    defaultSizePct: 26,
    originXPct: 60,
    originYPct: 12,
  });
  placements.set(preset.id, placement);
  return placement;
}

/**
 * Framing transform. `xPct` / `yPct` are the centre of the visible frame
 * expressed in % of the source image, `zoom` is 1 = "cover the frame".
 */
export type BlockImageCrop = { xPct: number; yPct: number; zoom: number };

export const DEFAULT_BLOCK_CROP: BlockImageCrop = { xPct: 50, yPct: 50, zoom: 1 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const MAX_BLOCK_ZOOM = 4;

export function sanitizeBlockCrop(value: unknown): BlockImageCrop {
  if (!value || typeof value !== "object") return { ...DEFAULT_BLOCK_CROP };
  const raw = value as Record<string, unknown>;
  return {
    xPct: clamp(Number(raw.xPct), 0, 100),
    yPct: clamp(Number(raw.yPct), 0, 100),
    zoom: clamp(Number(raw.zoom), 1, MAX_BLOCK_ZOOM),
  };
}

/** Defensive read of a persisted `image_marks` value. */
export function sanitizeBlockMarks(
  aspect: string | null | undefined,
  value: unknown,
): PlacedMark[] {
  return blockImagePlacement(aspect).sanitize(value) ?? [];
}
