/**
 * Site footer shell, abstracted from the live ICF Switzerland site chrome:
 * Deep Blue band, white lockup and copyright on the left, one wrapping row of
 * secondary links on the right.
 *
 * Like `SiteHeader`, all links are data the consuming project supplies. The
 * footer carries the secondary set — legal, contact, external — and does not
 * need to mirror the header nav.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/design-system/icf-welcome-design-system-a835df/components/brand/Logo";
import { cn } from "@/design-system/icf-welcome-design-system-a835df/lib/utils";
import type { SiteNavItem } from "@/design-system/icf-welcome-design-system-a835df/components/chrome/SiteHeader";

export type SiteFooterExternalLink = {
  href: string;
  label: string;
};

export interface SiteFooterProps extends React.ComponentPropsWithoutRef<"footer"> {
  /** In-app footer links: secondary destinations, legal, contact. */
  items?: readonly SiteNavItem[];
  /** External links, opened in a new tab with `rel="noopener noreferrer"`. */
  externalLinks?: readonly SiteFooterExternalLink[];
  /** Line under the lockup. Defaults to `© <year> ICF Switzerland`. */
  copyright?: React.ReactNode;
  /** Show the white lockup above the copyright. Defaults to true. */
  showLogo?: boolean;
  /** Accessible name of the footer nav landmark. */
  navLabel?: string;
}

const LINK = "inline-flex min-h-6 items-center text-white/80 hover:text-white";

export const SiteFooter = React.forwardRef<HTMLElement, SiteFooterProps>(function SiteFooter(
  {
    items = [],
    externalLinks = [],
    copyright,
    showLogo = true,
    navLabel = "Footer",
    className,
    ...props
  },
  ref,
) {
  const hasLinks = items.length > 0 || externalLinks.length > 0;

  return (
    <footer ref={ref} className={cn("bg-hero text-hero-foreground", className)} {...props}>
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 text-xs sm:flex-row sm:items-center sm:px-8">
        <div className="flex flex-col gap-3">
          {/* White lockup: the footer band is Deep Blue, same as the header. */}
          {showLogo && <Logo orientation="horizontal" tone="white" decorative className="w-40" />}
          <p className="text-white/70">
            {copyright ?? `© ${new Date().getFullYear()} ICF Switzerland`}
          </p>
        </div>
        {hasLinks && (
          <nav aria-label={navLabel} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {items.map((item) => (
              <Link key={item.to} to={item.to} className={LINK}>
                {item.label}
              </Link>
            ))}
            {externalLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
});
