/**
 * Generic, canvas-agnostic model for hand-placed brush marks.
 * Exports: MARK_COLORS, MarkColor, PlacedMark, BRUSH_PALETTE, createPlacement.
 *
 * Geometry is stored in percentages of the canvas, so an editor preview at any
 * scale and the final render (rasterised PNG or public hero) always agree.
 * Both the LinkedIn visual builder and the hero designer build on this.
 */
import type { MarkName } from "@/components/marks";

/** The three brand accent colours a mark may take. */
export const MARK_COLORS = ["#2B379B", "#5778FA", "#EFCB30"] as const;
export type MarkColor = (typeof MARK_COLORS)[number];

/** Eight brushes, each with a distinct visual role. */
export const BRUSH_PALETTE: { id: string; name: MarkName; label: string }[] = [
  { id: "circle", name: "circular2", label: "Circle sweep" },
  { id: "arrow", name: "arrow2", label: "Arrow" },
  { id: "asterisk", name: "asterisk2", label: "Asterisk" },
  { id: "star", name: "star1", label: "Star" },
  { id: "highlight", name: "highlight2", label: "Highlight bar" },
  { id: "line", name: "line1", label: "Single line" },
  { id: "straight-line", name: "line2", label: "Straight single line" },
  { id: "double-line", name: "line4", label: "Double line" },
];

/** A mark placed by hand. Geometry is in % of the canvas so scale never matters. */
export type PlacedMark = {
  id: string;
  name: MarkName;
  /** Top-left corner, in % of canvas width / height. */
  xPct: number;
  yPct: number;
  /** Square box width, in % of canvas width. */
  sizePct: number;
  color: MarkColor;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

let counter = 0;
const nextId = () => `mark-${Date.now().toString(36)}-${(counter += 1)}`;

export type MarkPlacement = {
  width: number;
  height: number;
  limit: number;
  minSizePct: number;
  maxSizePct: number;
  /** Square box: its height in % of the canvas height. */
  heightPct: (sizePct: number) => number;
  /** Keeps a mark sized sensibly and fully inside the safe margin. */
  clamp: (mark: PlacedMark) => PlacedMark;
  /** A new mark, dropped at a comfortable size and staggered position. */
  create: (name: MarkName, index: number) => PlacedMark;
  /** Defensive read of a persisted layout (jsonb from the database). */
  sanitize: (value: unknown) => PlacedMark[] | null;
};

export function createPlacement(opts: {
  width: number;
  height: number;
  marginPx: number;
  minSizePx: number;
  maxSizePx: number;
  limit: number;
  /** Default box width for a freshly added mark, in % of canvas width. */
  defaultSizePct?: number;
  /** Where new marks land, in % of canvas width. */
  originXPct?: number;
  originYPct?: number;
}): MarkPlacement {
  const { width, height, marginPx, minSizePx, maxSizePx, limit } = opts;
  const minSizePct = (minSizePx / width) * 100;
  const maxSizePct = (maxSizePx / width) * 100;
  const marginXPct = (marginPx / width) * 100;
  const marginYPct = (marginPx / height) * 100;

  const heightPct = (sizePct: number) => (sizePct * width) / height;

  const clamp = (mark: PlacedMark): PlacedMark => {
    const maxByHeight = ((100 - 2 * marginYPct) * height) / width;
    const sizePct = clampNumber(
      mark.sizePct,
      minSizePct,
      Math.min(maxSizePct, 100 - 2 * marginXPct, maxByHeight),
    );
    const hPct = heightPct(sizePct);
    return {
      ...mark,
      sizePct,
      xPct: clampNumber(mark.xPct, marginXPct, 100 - marginXPct - sizePct),
      yPct: clampNumber(mark.yPct, marginYPct, 100 - marginYPct - hPct),
    };
  };

  const create = (name: MarkName, index: number): PlacedMark =>
    clamp({
      id: nextId(),
      name,
      xPct: (opts.originXPct ?? 64) + (index % 2) * 6,
      yPct: (opts.originYPct ?? 8) + (index % 3) * 22,
      sizePct: opts.defaultSizePct ?? 30,
      color: MARK_COLORS[index % MARK_COLORS.length]!,
    });

  const sanitize = (value: unknown): PlacedMark[] | null => {
    if (!Array.isArray(value)) return null;
    return value
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .slice(0, limit)
      .map((item, index) => {
        const color = MARK_COLORS.includes(item.color as MarkColor)
          ? (item.color as MarkColor)
          : MARK_COLORS[0]!;
        return clamp({
          id: typeof item.id === "string" ? item.id : `mark-restored-${index}`,
          name: item.name as MarkName,
          xPct: Number(item.xPct) || 0,
          yPct: Number(item.yPct) || 0,
          sizePct: Number(item.sizePct) || minSizePct,
          color,
        });
      })
      .filter((mark) => typeof mark.name === "string" && mark.name.length > 0);
  };

  return { width, height, limit, minSizePct, maxSizePct, heightPct, clamp, create, sanitize };
}

/** Fresh ids for a layout copied from a template. */
export function withFreshIds(marks: Omit<PlacedMark, "id">[]): PlacedMark[] {
  return marks.map((mark) => ({ ...mark, id: nextId() }));
}
