/**
 * Social banners — the chapter's profile-header composition.
 *
 * The banner is rebuilt from tokens rather than shipped as flat artwork, so one
 * component serves every platform crop and the tagline stays editable and
 * translatable. Everything scales off the container width (`cqw` inside a
 * `@container`), which means a banner renders identically at the 1584px LinkedIn
 * export size and in a 320px documentation tile.
 *
 * Exports: SOCIAL_FORMATS, SocialBanner. Consumed by the /social route.
 */
import * as React from "react";
import { BrushMark } from "@/design-system/icf-welcome-design-system-a835df/components/brush/BrushMark";
import type { MarkName } from "@/design-system/icf-welcome-design-system-a835df/components/brush/marks";
import { cn } from "@/design-system/icf-welcome-design-system-a835df/lib/utils";

export type SocialFormatName = "linkedin" | "x" | "facebook";

export type SocialFormat = {
  /** Platform label as the user knows it. */
  label: string;
  /** Pixel dimensions of the export. */
  width: number;
  height: number;
  /** Where the safe area sits, in plain words. */
  note: string;
};

/**
 * Export sizes for the three profile headers the chapter maintains. Keep the
 * banner at these exact pixel sizes: every platform re-crops anything else.
 */
export const SOCIAL_FORMATS = {
  linkedin: {
    label: "LinkedIn page",
    width: 1584,
    height: 396,
    note: "The avatar overlaps the lower left on desktop — keep the tagline centred and clear of that corner.",
  },
  x: {
    label: "X header",
    width: 1500,
    height: 500,
    note: "X crops the top and bottom on narrow viewports, so nothing sits in the outer sixth.",
  },
  facebook: {
    label: "Facebook page",
    width: 820,
    height: 312,
    note: "Mobile crops the sides to 640px wide — the tagline has to survive that trim.",
  },
} as const satisfies Record<SocialFormatName, SocialFormat>;

export const SOCIAL_FORMAT_NAMES = Object.keys(SOCIAL_FORMATS) as SocialFormatName[];

export type SocialBannerProps = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  /** Export crop the banner is composed for. */
  format?: SocialFormatName;
  /** Words before the highlighted final term. */
  children?: React.ReactNode;
  /** The final word, set in the teal pill. */
  highlight?: string;
  /** Mark painted into the right edge. */
  mark?: MarkName;
};

/**
 * The chapter banner: Deep Blue field, one line of Quicksand, a teal pill on the
 * closing word and a brush mark bleeding off the right edge.
 */
export function SocialBanner({
  format = "linkedin",
  children = "Inspire. Transform.",
  highlight = "Thrive.",
  mark = "Asterisk02",
  className,
  style,
  ...props
}: SocialBannerProps) {
  const { width, height, label } = SOCIAL_FORMATS[format];

  return (
    <div
      role="img"
      aria-label={`${label} banner: ${typeof children === "string" ? children : ""} ${highlight}`.trim()}
      className={cn(
        "@container relative isolate w-full overflow-hidden bg-hero text-hero-foreground",
        className,
      )}
      style={{ aspectRatio: `${width} / ${height}`, ...style }}
      {...props}
    >
      {/*
       * The mark is oversized and pushed past the right edge on purpose: the
       * bleed is what stops the banner reading as a centred logo slide. It is
       * tinted with the primary token, so it stays a shade of ICF Blue on Deep
       * Blue rather than a hand-picked colour. Sizing is a percentage of the
       * banner height (not a container query unit): the container is queried on
       * inline-size only, so `cqh` would resolve against the viewport.
       */}
      <BrushMark
        name={mark}
        className="absolute -right-[6%] top-1/2 h-[150%] -translate-y-1/2 text-primary opacity-90"
      />

      <div className="relative flex h-full items-center px-[5cqw]">
        <p className="font-heading text-[5.4cqw] font-medium leading-none tracking-tight whitespace-nowrap">
          {children}{" "}
          <span className="inline-block whitespace-nowrap rounded-full bg-cyan px-[0.42em] pb-[0.14em] pt-[0.08em] text-cyan-foreground">
            {highlight}
          </span>
        </p>
      </div>
    </div>
  );
}
