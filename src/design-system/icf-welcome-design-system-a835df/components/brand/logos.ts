/**
 * The official ICF Switzerland Charter Chapter logo lockups.
 *
 * These are supplied brand artwork, not generated assets: the files are the
 * chapter's approved exports, served from the CDN and never recoloured or
 * redrawn in code. Each entry records the orientation, the background the
 * variant is cleared for, and the intrinsic pixel size so the <Logo> component
 * can reserve the right box and avoid layout shift.
 */
import hPositive from "@/design-system/icf-welcome-design-system-a835df/assets/logos/ICF_SwitzerlandCharterChapter_Horizontal_RGB_Positive.png.asset.json";
import hNegative from "@/design-system/icf-welcome-design-system-a835df/assets/logos/ICF_SwitzerlandCharterChapter_Horizontal_RGB_Negative.png.asset.json";
import hWhite from "@/design-system/icf-welcome-design-system-a835df/assets/logos/ICF_SwitzerlandCharterChapter_Horizontal_RGB_White.png.asset.json";
import vPositive from "@/design-system/icf-welcome-design-system-a835df/assets/logos/ICF_SwitzerlandCharterChapter_Vertical_RGB_Positive.png.asset.json";
import vNegative from "@/design-system/icf-welcome-design-system-a835df/assets/logos/ICF_SwitzerlandCharterChapter_Vertical_RGB_Negative.png.asset.json";
import vWhite from "@/design-system/icf-welcome-design-system-a835df/assets/logos/ICF_SwitzerlandCharterChapter_Vertical_RGB_White.png.asset.json";

export type LogoOrientation = "horizontal" | "vertical";

/**
 * `positive` — full colour, for light surfaces (background, card).
 * `negative` — cyan wordmark, for the dark hero band and photography.
 * `white` — single-colour white, for busy imagery or one-colour printing.
 */
export type LogoTone = "positive" | "negative" | "white";

export type LogoSpec = {
  url: string;
  width: number;
  height: number;
  orientation: LogoOrientation;
  tone: LogoTone;
  /** The surface this variant is cleared for. */
  on: string;
};

export const LOGOS = {
  "horizontal-positive": {
    url: hPositive.url,
    width: 1920,
    height: 723,
    orientation: "horizontal",
    tone: "positive",
    on: "Light surfaces — page background, cards",
  },
  "horizontal-negative": {
    url: hNegative.url,
    width: 1920,
    height: 723,
    orientation: "horizontal",
    tone: "negative",
    on: "Deep Blue hero band, dark photography",
  },
  "horizontal-white": {
    url: hWhite.url,
    width: 1920,
    height: 723,
    orientation: "horizontal",
    tone: "white",
    on: "Busy imagery, one-colour output",
  },
  "vertical-positive": {
    url: vPositive.url,
    width: 1920,
    height: 1741,
    orientation: "vertical",
    tone: "positive",
    on: "Light surfaces where width is tight",
  },
  "vertical-negative": {
    url: vNegative.url,
    width: 1920,
    height: 1741,
    orientation: "vertical",
    tone: "negative",
    on: "Deep Blue panels, square social crops",
  },
  "vertical-white": {
    url: vWhite.url,
    width: 1920,
    height: 1741,
    orientation: "vertical",
    tone: "white",
    on: "Busy imagery, one-colour output",
  },
} as const satisfies Record<string, LogoSpec>;

export type LogoName = keyof typeof LOGOS;

export const LOGO_NAMES = Object.keys(LOGOS) as LogoName[];

/** Minimum reproduction sizes from the ICF brand guide, in CSS pixels. */
export const LOGO_MIN_SIZE: Record<LogoOrientation, number> = {
  horizontal: 160,
  vertical: 96,
};
