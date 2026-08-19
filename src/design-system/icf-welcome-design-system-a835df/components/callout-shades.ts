/**
 * Shared constants and types for callout styling and aliases.
 * Exports: CALLOUT_SHADES, CalloutShade, CALLOUT_ALIASES, SHADE_SWATCH. Consumed by the Callout component and CMS toolbar.
 */
export const CALLOUT_SHADES = ["info", "highlight", "warning"] as const;
export type CalloutShade = (typeof CALLOUT_SHADES)[number];

export const CALLOUT_ALIASES: Record<string, CalloutShade> = {
  info: "info",
  note: "info",
  tip: "info",
  highlight: "highlight",
  important: "highlight",
  warning: "warning",
  caution: "warning",
  danger: "warning",
};

export const SHADE_SWATCH: Record<CalloutShade, string> = {
  info: "bg-teal",
  highlight: "bg-mark-yellow",
  warning: "bg-destructive",
};
