/**
 * Site-wide footer with copyright and secondary navigation links, shared by
 * all public page layouts.
 */
import { Shield } from "lucide-react";
import { LocaleLink, useI18n } from "@/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="bg-hero text-hero-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 text-xs sm:flex-row sm:items-center sm:px-8">
        <p className="text-white/70">
          © {new Date().getFullYear()} {t("common.footer.copyright")}
        </p>
        <nav
          aria-label={t("common.nav.footerLabel")}
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <LocaleLink
            to="/find-a-coach"
            className="inline-flex min-h-6 items-center text-white/80 hover:text-white"
          >
            {t("common.nav.findACoach")}
          </LocaleLink>
          <LocaleLink
            to="/for-coaches"
            className="inline-flex min-h-6 items-center text-white/80 hover:text-white"
          >
            {t("common.nav.forCoaches")}
          </LocaleLink>
          <LocaleLink
            to="/for-organisations"
            className="inline-flex min-h-6 items-center text-white/80 hover:text-white"
          >
            {t("common.nav.forOrganisations")}
          </LocaleLink>
          <LocaleLink
            to="/insights"
            className="inline-flex min-h-6 items-center text-white/80 hover:text-white"
          >
            {t("common.nav.insights")}
          </LocaleLink>
          <LocaleLink
            to="/events"
            className="inline-flex min-h-6 items-center text-white/80 hover:text-white"
          >
            {t("common.nav.events")}
          </LocaleLink>
          <LocaleLink
            to="/about"
            className="inline-flex min-h-6 items-center text-white/80 hover:text-white"
          >
            {t("common.nav.about")}
          </LocaleLink>
          <LocaleLink
            to="/privacy"
            className="inline-flex min-h-6 items-center text-white/80 hover:text-white"
          >
            {t("common.footer.privacy")}
          </LocaleLink>
          <a
            href="https://new.coachingfederation.ch/.well-known/trust.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-6 items-center gap-1.5 text-white/80 hover:text-white"
          >
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            {t("common.footer.trustCenter")}
          </a>
          <LocaleLink
            to="/imprint"
            className="inline-flex min-h-6 items-center text-white/80 hover:text-white"
          >
            {t("common.footer.imprint")}
          </LocaleLink>
          <a
            href="https://coachingfederation.org/credentialing/coaching-ethics/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-6 items-center text-white/80 hover:text-white"
          >
            {t("common.footer.ethics")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
