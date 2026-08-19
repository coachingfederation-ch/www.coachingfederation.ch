/**
 * Style guide footer, ported from the ICF site chrome: dark hero band, muted
 * white links, copyright on the left. Links are presentational only.
 */
import { Link } from "@tanstack/react-router";
import { Logo } from "@/design-system/icf-welcome-design-system-a835df/components/brand/Logo";

const LINK = "inline-flex min-h-6 items-center text-white/80 hover:text-white";

export function SiteFooter() {
  return (
    <footer className="bg-hero text-hero-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 text-xs sm:flex-row sm:items-center sm:px-8">
        <div className="flex flex-col gap-3">
          <Logo orientation="horizontal" tone="white" decorative className="w-40" />
          <p className="text-white/70">
          © {new Date().getFullYear()} ICF Switzerland — design system reference
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to="/brand" className={LINK}>
            Brand
          </Link>
          <Link to="/foundations" className={LINK}>
            Foundations
          </Link>
          <Link to="/components" className={LINK}>
            Components
          </Link>
          <Link to="/patterns" className={LINK}>
            Patterns
          </Link>
          <Link to="/logos" className={LINK}>
            Logo
          </Link>
          <Link to="/social" className={LINK}>
            Social
          </Link>
          <a
            href="https://coachingfederation.org"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            coachingfederation.org
          </a>
        </nav>
      </div>
    </footer>
  );
}
