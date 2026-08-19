/**
 * Brush marks — the hand-drawn layer of the ICF visual language.
 *
 * The marks are painted with `mask-image` rather than `<img>` on purpose: a
 * masked element takes its colour from `currentColor`, so a mark can only ever
 * be tinted with a design token (`text-accent`, `text-primary`, …) and never
 * with a raw hex value baked into the artwork. It also keeps them decorative by
 * default — every instance is `aria-hidden`, since a mark carries no meaning a
 * screen-reader user needs.
 */
import * as React from "react";
import { cn } from "@/design-system/icf-welcome-design-system-a835df/lib/utils";
import { MARKS, type MarkName } from "./marks";

export type BrushMarkProps = Omit<React.ComponentPropsWithoutRef<"span">, "children"> & {
  /** Which mark from the library to paint. */
  name: MarkName;
  /**
   * Keep the artwork's intrinsic aspect ratio. Leave on when only one axis is
   * constrained; turn off to stretch a mark across a box (underlines).
   */
  preserveRatio?: boolean;
};

export function BrushMark({
  name,
  preserveRatio = true,
  className,
  style,
  ...props
}: BrushMarkProps) {
  const mark = MARKS[name];

  return (
    <span
      aria-hidden="true"
      data-mark={name}
      className={cn("pointer-events-none inline-block shrink-0 bg-current", className)}
      style={{
        maskImage: `url("${mark.url}")`,
        WebkitMaskImage: `url("${mark.url}")`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: preserveRatio ? "contain" : "100% 100%",
        WebkitMaskSize: preserveRatio ? "contain" : "100% 100%",
        ...(preserveRatio ? { aspectRatio: `${mark.width} / ${mark.height}` } : {}),
        ...style,
      }}
      {...props}
    />
  );
}

export type MarkedTextProps = {
  /** The words the mark sits behind or under. */
  children: React.ReactNode;
  /** Underline / highlight mark. Defaults to the thin single stroke. */
  name?: MarkName;
  /** Extra classes for the mark itself, e.g. a colour token or height. */
  markClassName?: string;
  className?: string;
};

/**
 * Wraps an inline phrase and lays a stretched mark underneath it — the
 * hand-underlined emphasis used in ICF headlines.
 */
export function MarkedText({
  children,
  name = "TextHighlighMark01",
  markClassName,
  className,
}: MarkedTextProps) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{children}</span>
      <BrushMark
        name={name}
        preserveRatio={false}
        className={cn(
          "absolute inset-x-0 -bottom-1 h-[0.28em] w-full text-accent",
          markClassName,
        )}
      />
    </span>
  );
}
