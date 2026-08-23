/**
 * Brush marks — the hand-drawn layer of the ICF visual language.
 *
 * Two rendering modes, both of which guarantee the mark can only be tinted with
 * a design token (it takes its colour from `currentColor`, never from artwork):
 *
 * - `render="mask"` (default) paints the artwork with `mask-image`. Cheapest,
 *   cached by the browser like any image.
 * - `render="inline"` fetches the SVG once per mark (via `loadMarkSvg`) and
 *   inlines it with
 *   `fill="currentColor"`. Needed when the DOM is rasterised to a canvas
 *   (`html-to-image` share cards), which does not reproduce masked backgrounds.
 *
 * Neither mode bundles artwork: marks are fetched lazily, per mark, on use.
 * Every instance is `aria-hidden` — a mark carries no meaning a screen-reader
 * user needs.
 */
import * as React from "react";
import { cn } from "@/design-system/icf-welcome-design-system-a835df/lib/utils";
import { MARKS, resolveMarkName, type MarkNameOrAlias } from "./marks";
import { loadMarkSvgFromUrl } from "./mark-svg";

export type BrushMarkRender = "mask" | "inline";

export type BrushMarkProps = Omit<React.ComponentPropsWithoutRef<"span">, "children"> & {
  /** Which mark from the library to paint. Canonical name or short alias. */
  name: MarkNameOrAlias;
  /**
   * Keep the artwork's intrinsic aspect ratio. Leave on when only one axis is
   * constrained; turn off to stretch a mark across a box (underlines).
   */
  preserveRatio?: boolean;
  /** Rendering strategy. Use `"inline"` for DOM-to-canvas export. */
  render?: BrushMarkRender;
};

export function BrushMark({
  name,
  preserveRatio = true,
  render = "mask",
  className,
  style,
  ...props
}: BrushMarkProps) {
  const markName = resolveMarkName(name);
  const mark = MARKS[markName];
  const [markup, setMarkup] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (render !== "inline") {
      setMarkup(null);
      return;
    }
    let active = true;
    loadMarkSvgFromUrl(mark.url)
      .then((svg) => {
        if (active) setMarkup(svg);
      })
      .catch(() => {
        if (active) setMarkup(null);
      });
    return () => {
      active = false;
    };
  }, [render, mark.url]);

  if (render === "inline") {
    return (
      <span
        aria-hidden="true"
        data-mark={markName}
        data-render="inline"
        className={cn(
          "pointer-events-none inline-block shrink-0 text-current [&>svg]:h-full [&>svg]:w-full",
          className,
        )}
        style={{
          ...(preserveRatio ? { aspectRatio: `${mark.width} / ${mark.height}` } : {}),
          ...style,
        }}
        {...(markup ? { dangerouslySetInnerHTML: { __html: markup } } : {})}
        {...props}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      data-mark={markName}
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
  name?: MarkNameOrAlias;
  /** Extra classes for the mark itself, e.g. a colour token or height. */
  markClassName?: string;
  className?: string;
  /** Rendering strategy for the mark. Use `"inline"` for canvas export. */
  render?: BrushMarkRender;
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
  render = "mask",
}: MarkedTextProps) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{children}</span>
      <BrushMark
        name={name}
        preserveRatio={false}
        render={render}
        className={cn(
          "absolute inset-x-0 -bottom-1 h-[0.28em] w-full text-accent",
          markClassName,
        )}
      />
    </span>
  );
}
