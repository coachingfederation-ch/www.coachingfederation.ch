/**
 * Thematic callout component for highlighting notes, tips, and warnings in markdown content.
 * Exports: Callout, calloutShadeFrom, and re-exports from callout-shades. Consumed by Markdown and MarkdownToolbar.
 */
import type { ReactNode } from "react";
import {
  CALLOUT_ALIASES,
  type CalloutShade,
} from "@/design-system/icf-welcome-design-system-a835df/components/callout-shades";

export {
  CALLOUT_SHADES,
  SHADE_SWATCH,
  type CalloutShade,
} from "@/design-system/icf-welcome-design-system-a835df/components/callout-shades";

const STYLES: Record<CalloutShade, { wrap: string; rail: string; chip: string }> = {
  info: {
    wrap: "bg-teal-soft/70 border-teal/25",
    rail: "bg-teal",
    chip: "bg-teal-soft text-teal-foreground",
  },
  highlight: {
    wrap: "bg-warn-soft/80 border-mark-yellow/50",
    rail: "bg-mark-yellow",
    chip: "bg-mark-yellow/40 text-foreground",
  },
  warning: {
    wrap: "bg-destructive/8 border-destructive/25",
    rail: "bg-destructive",
    chip: "bg-destructive/12 text-destructive",
  },
};

/** Resolves a raw `data-callout` attribute value to a known shade, or null. */
export function calloutShadeFrom(value: unknown): CalloutShade | null {
  if (typeof value !== "string") return null;
  return CALLOUT_ALIASES[value.toLowerCase()] ?? null;
}

export function Callout({
  shade,
  emoji,
  children,
}: {
  shade: CalloutShade;
  emoji: string | null;
  children: ReactNode;
}) {
  const s = STYLES[shade];
  return (
    <div
      className={`relative my-8 overflow-hidden rounded-2xl border ${s.wrap} py-5 pl-7 pr-6 text-[15px] leading-relaxed shadow-[var(--shadow-soft)]`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${s.rail}`} aria-hidden />
      <div className="flex gap-4">
        {emoji ? (
          <span
            aria-hidden
            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${s.chip}`}
          >
            {emoji}
          </span>
        ) : null}
        <div className="min-w-0 flex-1 space-y-3 [&>*:first-child]:mt-0">{children}</div>
      </div>
    </div>
  );
}
