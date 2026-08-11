/**
 * Interactive brush-mark canvas shared by the LinkedIn share dialog and the
 * hero designer. Exports: MarkPlacementCanvas.
 *
 * It renders selection chrome (palette, drag, resize handle, colour swatches,
 * delete) *around* whatever preview is passed as children, so none of the
 * chrome ever reaches a rasterised or public render.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { X } from "lucide-react";
import { Mark } from "@/components/marks";
import {
  BRUSH_PALETTE,
  MARK_COLORS,
  type MarkColor,
  type MarkPlacement,
  type PlacedMark,
} from "@/lib/mark-placement";

type Drag =
  | { kind: "move"; id: string; startX: number; startY: number; originX: number; originY: number }
  | { kind: "resize"; id: string; startX: number; originSize: number };

export type MarkCanvasLabels = {
  palette: string;
  limit: string;
  overlap: string;
  remove: string;
  colour: string;
};

export function MarkPlacementCanvas({
  marks,
  onChange,
  placement,
  width,
  height,
  labels,
  warnWhen,
  children,
}: {
  marks: PlacedMark[];
  onChange: (next: PlacedMark[]) => void;
  placement: MarkPlacement;
  /** Size of the scaled preview the overlay sits on, in CSS pixels. */
  width: number;
  height: number;
  children: React.ReactNode;
  labels: MarkCanvasLabels;
  /** Optional guard, e.g. "this mark sits over the headline". */
  warnWhen?: (mark: PlacedMark) => boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const update = (id: string, patch: Partial<PlacedMark>) =>
    onChange(marks.map((m) => (m.id === id ? placement.clamp({ ...m, ...patch }) : m)));

  const add = (index: number) => {
    if (marks.length >= placement.limit) return;
    const mark = placement.create(BRUSH_PALETTE[index]!.name, marks.length);
    onChange([...marks, mark]);
    setSelected(mark.id);
  };

  const remove = (id: string) => {
    onChange(marks.filter((m) => m.id !== id));
    setSelected(null);
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const mark = marks.find((m) => m.id === drag.id);
    if (!mark) return;
    if (drag.kind === "move") {
      const dx = ((event.clientX - drag.startX) / width) * 100;
      const dy = ((event.clientY - drag.startY) / height) * 100;
      update(drag.id, { xPct: drag.originX + dx, yPct: drag.originY + dy });
    } else {
      const dx = ((event.clientX - drag.startX) / width) * 100;
      update(drag.id, { sizePct: drag.originSize + dx });
    }
  };

  const endDrag = (event: ReactPointerEvent) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const warn = warnWhen ? marks.some(warnWhen) : false;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{labels.palette}</span>
        {BRUSH_PALETTE.map((brush, index) => (
          <button
            key={brush.id}
            type="button"
            title={brush.label}
            aria-label={brush.label}
            onClick={() => add(index)}
            disabled={marks.length >= placement.limit}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40"
          >
            <Mark name={brush.name} className="h-5 w-5" />
          </button>
        ))}
        <span className="text-xs text-muted-foreground">
          {marks.length}/{placement.limit} · {labels.limit}
        </span>
      </div>

      <div
        ref={surfaceRef}
        className="relative select-none touch-none overflow-hidden rounded-xl border border-border"
        style={{ width, height }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          if (selected && (event.key === "Delete" || event.key === "Backspace")) {
            event.preventDefault();
            remove(selected);
          }
        }}
        tabIndex={-1}
      >
        {children}
        {marks.map((mark) => {
          const isSelected = selected === mark.id;
          return (
            <div
              key={mark.id}
              role="button"
              tabIndex={0}
              onPointerDown={(event) => {
                setSelected(mark.id);
                dragRef.current = {
                  kind: "move",
                  id: mark.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  originX: mark.xPct,
                  originY: mark.yPct,
                };
                event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelected(mark.id);
                }
              }}
              className={`absolute cursor-move rounded-sm ${
                isSelected ? "ring-2 ring-primary/70" : "hover:ring-1 hover:ring-primary/40"
              }`}
              style={{
                left: `${mark.xPct}%`,
                top: `${mark.yPct}%`,
                width: `${mark.sizePct}%`,
                height: `${placement.heightPct(mark.sizePct)}%`,
              }}
            >
              {isSelected ? (
                <>
                  <div className="absolute -top-8 left-0 flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-1 shadow-sm">
                    <span className="sr-only">{labels.colour}</span>
                    {MARK_COLORS.map((colour) => (
                      <button
                        key={colour}
                        type="button"
                        aria-label={colour}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => update(mark.id, { color: colour as MarkColor })}
                        className={`h-4 w-4 rounded-full border ${
                          mark.color === colour ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ background: colour }}
                      />
                    ))}
                    <button
                      type="button"
                      aria-label={labels.remove}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => remove(mark.id)}
                      className="ml-1 grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <span
                    role="slider"
                    tabIndex={0}
                    aria-label="Resize"
                    aria-valuemin={Math.round(placement.minSizePct)}
                    aria-valuemax={Math.round(placement.maxSizePct)}
                    aria-valuenow={Math.round(mark.sizePct)}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      dragRef.current = {
                        kind: "resize",
                        id: mark.id,
                        startX: event.clientX,
                        originSize: mark.sizePct,
                      };
                      surfaceRef.current?.setPointerCapture(event.pointerId);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowRight")
                        update(mark.id, { sizePct: mark.sizePct + 2 });
                      if (event.key === "ArrowLeft") update(mark.id, { sizePct: mark.sizePct - 2 });
                    }}
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-se-resize rounded-full border border-background bg-primary"
                  />
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {warn ? <p className="text-xs text-warn-foreground">{labels.overlap}</p> : null}
    </div>
  );
}
