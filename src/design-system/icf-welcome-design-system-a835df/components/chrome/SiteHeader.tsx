/**
 * Site header shell, abstracted from the live ICF Switzerland site chrome.
 *
 * The layout is the fixed part — Deep Blue band, lockup top-left, primary nav
 * and utility controls right, accent pill CTA last, mobile sheet under the bar.
 * Everything content-shaped is a prop: navigation, CTA and utility controls are
 * supplied by the consuming project. `variant="hero"` is the tall home-page bar
 * (large lockup, generous band), `variant="compact"` the inner-page bar.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/design-system/icf-welcome-design-system-a835df/components/brand/Logo";
import { cn } from "@/design-system/icf-welcome-design-system-a835df/lib/utils";

export type SiteNavItem = {
  /** Route path, e.g. `/about`. Must exist in the consuming project. */
  to: string;
  label: string;
};

export type SiteHeaderVariant = "hero" | "compact";

export interface SiteHeaderProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Primary navigation for the consuming project. Keep it to 4–6 entries. */
  items?: readonly SiteNavItem[];
  /** `hero` on the landing page (large lockup), `compact` on inner pages. */
  variant?: SiteHeaderVariant;
  /** Where the lockup links to. Defaults to `/`. */
  homeTo?: string;
  /** Accessible name of the primary nav landmark. */
  navLabel?: string;
  /** Accessible label on the lockup link. */
  brandLabel?: string;
  /** Small kicker beside the lockup, e.g. a sub-brand or section name. */
  kicker?: React.ReactNode;
  /** The single accent-pill call to action, rendered last in the bar. */
  cta?: SiteNavItem;
  /**
   * Utility controls between the nav and the CTA — language switcher, account
   * menu, search. Ghost-outlined pills only; never a second accent pill.
   */
  utilitySlot?: React.ReactNode;
  /** Extra block appended inside the mobile sheet (e.g. account links). */
  mobileSlot?: React.ReactNode;
  /** Renders the band background and padding. Set false inside a hero band. */
  standalone?: boolean;
}

const NAV_LINK =
  "relative inline-flex h-10 items-center px-3 text-[12px] font-semibold text-white/75 transition after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-accent after:opacity-0 after:transition hover:text-white data-[status=active]:text-white data-[status=active]:after:opacity-100";

const CTA_PILL =
  "hidden h-10 items-center rounded-full bg-accent px-5 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground transition hover:brightness-105 lg:inline-flex";

export const SiteHeader = React.forwardRef<HTMLDivElement, SiteHeaderProps>(function SiteHeader(
  {
    items = [],
    variant = "compact",
    homeTo = "/",
    navLabel = "Main",
    brandLabel = "ICF Switzerland home",
    kicker,
    cta,
    utilitySlot,
    mobileSlot,
    standalone = true,
    className,
    ...props
  },
  ref,
) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const close = React.useCallback(() => setMenuOpen(false), []);
  // Unique per instance: the docs page renders two headers on one document.
  const sheetId = `site-mobile-nav-${React.useId()}`;

  // Escape closes the sheet — the sheet is a nav, not a modal, so no focus trap.
  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, close]);

  const hasSheet = items.length > 0 || Boolean(cta) || Boolean(mobileSlot);

  const bar = (
    <div className="relative flex items-center justify-between gap-3 sm:gap-4">
      {/* WCAG 2.4.1: lets keyboard users bypass the header on every page. */}
      <a
        href="#main"
        className="sr-only left-0 top-0 z-50 rounded-full bg-white text-sm font-semibold text-primary focus:not-sr-only focus:absolute focus:!px-4 focus:!py-2.5"
      >
        Skip to content
      </a>
      <Link to={homeTo} aria-label={brandLabel} className="inline-flex items-center gap-4">
        {/* Negative lockup: the header always sits on the Deep Blue band. */}
        <Logo
          orientation="horizontal"
          tone="negative"
          decorative
          className={variant === "hero" ? "w-44 sm:w-60" : "w-36 sm:w-44"}
        />
        {kicker ? (
          <span className="hidden border-l border-white/25 pl-4 text-[10px] font-bold uppercase leading-[1.35] tracking-[0.22em] text-accent sm:inline-block">
            {kicker}
          </span>
        ) : null}
      </Link>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {items.length > 0 && (
          <nav aria-label={navLabel} className="hidden items-center gap-1 lg:inline-flex">
            {items.map((item) => (
              <Link key={item.to} to={item.to} activeOptions={{ exact: true }} className={NAV_LINK}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        {utilitySlot}
        {cta && (
          <Link to={cta.to} className={CTA_PILL}>
            {cta.label}
          </Link>
        )}
        {hasSheet && (
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls={sheetId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        )}
        {menuOpen && hasSheet && (
          <nav
            id={sheetId}
            aria-label={navLabel}
            className="absolute inset-x-0 top-full z-40 mt-3 flex flex-col rounded-2xl bg-hero p-2 text-[13px] font-semibold shadow-lg ring-1 ring-white/20 lg:hidden"
          >
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true }}
                onClick={close}
                className="rounded-full px-4 py-3 text-white/85 transition hover:bg-white/10 hover:text-white data-[status=active]:bg-white/15 data-[status=active]:text-white"
              >
                {item.label}
              </Link>
            ))}
            {cta && (
              <Link
                to={cta.to}
                onClick={close}
                className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground"
              >
                {cta.label}
              </Link>
            )}
            {mobileSlot}
          </nav>
        )}
      </div>
    </div>
  );

  if (!standalone) {
    return (
      <div ref={ref} className={className} {...props}>
        {bar}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("bg-hero text-hero-foreground", className)} {...props}>
      <div
        className={cn(
          "mx-auto max-w-7xl px-5 sm:px-8",
          variant === "hero" ? "py-6 sm:py-8" : "py-5",
        )}
      >
        {bar}
      </div>
    </div>
  );
});
