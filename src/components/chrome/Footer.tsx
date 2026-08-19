/**
 * Site-wide footer: a thin wrapper around the design system's `SiteFooter`
 * shell, supplying the locale-aware link component and the ordered secondary
 * link list (in-app routes plus the external Trust Center and ethics links).
 */
import { Shield } from "lucide-react";
import {
  SiteFooter as DsSiteFooter,
  type SiteLinkComponent,
} from "@/design-system/icf-welcome-design-system-a835df";
import { LocaleLink, useI18n } from "@/i18n";

const localeLinkComponent = LocaleLink as unknown as SiteLinkComponent;

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <DsSiteFooter
      linkComponent={localeLinkComponent}
      navLabel={t("common.nav.footerLabel")}
      copyright={`© ${new Date().getFullYear()} ${t("common.footer.copyright")}`}
      links={[
        { to: "/find-a-coach", label: t("common.nav.findACoach") },
        { to: "/for-coaches", label: t("common.nav.forCoaches") },
        { to: "/for-organisations", label: t("common.nav.forOrganisations") },
        { to: "/insights", label: t("common.nav.insights") },
        { to: "/events", label: t("common.nav.events") },
        { to: "/about", label: t("common.nav.about") },
        { to: "/privacy", label: t("common.footer.privacy") },
        {
          href: "https://new.coachingfederation.ch/.well-known/trust.html",
          label: t("common.footer.trustCenter"),
          icon: <Shield />,
        },
        { to: "/imprint", label: t("common.footer.imprint") },
        {
          href: "https://coachingfederation.org/credentialing/coaching-ethics/",
          label: t("common.footer.ethics"),
        },
      ]}
    />
  );
}
