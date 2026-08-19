/**
 * Renders an official ICF Switzerland lockup.
 *
 * The logo is artwork, so it is an <img> rather than a masked shape: it must
 * keep its own two brand colours and must never inherit a token colour. Pick
 * the variant that matches the surface — `positive` on light, `negative` on the
 * Deep Blue hero band, `white` over imagery.
 */
import * as React from "react";
import { cn } from "@/design-system/icf-welcome-design-system-a835df/lib/utils";
import { LOGOS, type LogoName, type LogoOrientation, type LogoTone } from "./logos";

/**
 * Cleared lockup widths. The lockup must never be smaller than `xs`
 * (~112px wide) or the "Switzerland Charter Chapter" wordmark stops being
 * legible. `full` fills the container — use it only inside a box you have
 * already sized.
 */
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";

const SIZES: Record<LogoSize, string> = {
  xs: "w-28",
  sm: "w-36",
  md: "w-44",
  lg: "w-60",
  xl: "w-80",
  full: "w-full",
};

export type LogoProps = Omit<React.ComponentPropsWithoutRef<"img">, "src" | "width" | "height"> & {
  orientation?: LogoOrientation;
  tone?: LogoTone;
  /** Cleared width step. Defaults to `full` so a sized parent still wins. */
  size?: LogoSize;
  /**
   * Decorative instances (e.g. next to a visible text lockup) pass `decorative`
   * so the logo is hidden from assistive tech instead of announced twice.
   */
  decorative?: boolean;
};

export function Logo({
  orientation = "horizontal",
  tone = "positive",
  size = "full",
  decorative = false,
  className,
  alt,
  ...props
}: LogoProps) {
  const key = `${orientation}-${tone}` as LogoName;
  const logo = LOGOS[key];

  return (
    <img
      src={logo.url}
      width={logo.width}
      height={logo.height}
      alt={decorative ? "" : (alt ?? "ICF Switzerland Charter Chapter")}
      {...(decorative ? { "aria-hidden": true } : {})}
      className={cn("h-auto max-w-full object-contain", SIZES[size], className)}
      {...props}
    />
  );
}
