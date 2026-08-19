/**
 * Site footer shell, abstracted from the live ICF Switzerland site chrome:
 * Deep Blue band, white lockup and copyright on the left, one wrapping row of
 * secondary links on the right.
 *
 * Like `SiteHeader`, all links are data the consuming project supplies, as one
 * ordered list: each entry is either an in-app route (`to`) or an external URL
 * (`href`), optionally with a leading icon. Order in the array is the order on
 * screen, so legal, contact and external links can be interleaved freely. The
 * footer carries the secondary set and does not need to mirror the header nav.
 */
import * as React from "react";
import { Logo } from "@/design-system/icf-welcome-design-system-a835df/components/brand/Logo";
import { cn } from "@/design-system/icf-welcome-design-system-a835df/lib/utils";
import { defaultLinkComponent, type SiteLinkComponent } from "@/design-system/icf-welcome-design-system-a835df/components/chrome/SiteHeader";

export type SiteFooterLink = {
  label: string;
  /** Optional leading icon (e.g. a lucide glyph). Rendered decoratively. */
  icon?: React.ReactNode;
  /** In-app route. Mutually exclusive with `href`. */
  to?: string;
  /** External URL — opened in a new tab with `rel="noopener noreferrer"`. */
  href?: string;
};

export interface SiteFooterProps extends React.ComponentPropsWithoutRef<"footer"> {
  /** The single ordered link list: in-app (`to`) and external (`href`) mixed. */
  links?: readonly SiteFooterLink[];
  /** Link component used for in-app links. Defaults to router `Link`. */
  linkComponent?: SiteLinkComponent;
  /** Line under the lockup. Translate it in the consuming project. */
  copyright?: React.ReactNode;
  /** Show the white lockup above the copyright. Defaults to true. */
  showLogo?: boolean;
  /** Accessible name of the footer nav landmark. */
  navLabel?: string;
}

const LINK = "inline-flex min-h-6 items-center gap-2 text-white/80 hover:text-white";

export const SiteFooter = React.forwardRef<HTMLElement, SiteFooterProps>(function SiteFooter(
  {
    links = [],
    linkComponent,
    copyright,
    showLogo = true,
    navLabel = "Footer",
    className,
    ...props
  },
  ref,
) {
  const NavLink = linkComponent ?? defaultLinkComponent;

  return (
    <footer ref={ref} className={cn("bg-hero text-hero-foreground", className)} {...props}>
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 text-xs sm:flex-row sm:items-center sm:px-8">
        <div className="flex flex-col gap-3">
          {/* White lockup: the footer band is Deep Blue, same as the header. */}
          {showLogo && <Logo orientation="horizontal" tone="white" decorative size="md" />}
          {copyright ? <p className="text-white/70">{copyright}</p> : null}
        </div>
        {links.length > 0 && (
          <nav aria-label={navLabel} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {links.map((item) => {
              const content = (
                <>
                  {item.icon ? (
                    <span aria-hidden="true" className="inline-flex [&_svg]:h-4 [&_svg]:w-4">
                      {item.icon}
                    </span>
                  ) : null}
                  {item.label}
                </>
              );

              return item.href ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK}
                >
                  {content}
                </a>
              ) : (
                <NavLink key={item.to} to={item.to!} className={LINK}>
                  {content}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </footer>
  );
});
