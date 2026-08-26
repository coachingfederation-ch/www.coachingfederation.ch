/**
 * Site header: a thin wrapper around the design system's `SiteHeader` shell.
 * The shell owns the Deep Blue band, lockup, nav, mobile sheet and accent pill;
 * this file supplies the localized data, `LocaleLink`, and the project-specific
 * utility controls (language switcher, account menu).
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, User } from "lucide-react";
import {
  Button,
  MenuRow,
  SiteHeader,
  type SiteLinkComponent,
} from "@/design-system/icf-welcome-design-system-a835df";
import { LocaleLink, useI18n } from "@/i18n";
import {
  CARD_SHADOW,
  navItems,
  signOutHere,
  useDismissable,
  useHeaderSession,
} from "@/components/chrome/constants";
import { LanguageSwitcher } from "@/components/chrome/LanguageSwitcher";
import { MobileAccountLinks } from "@/components/chrome/MobileMenu";

/** The chrome shells render every in-app link through the locale-aware link. */
const localeLinkComponent = LocaleLink as unknown as SiteLinkComponent;

/** Member login (signed out) / account menu (signed in). */
function AccountControl() {
  const { t } = useI18n();
  const { userId, roles } = useHeaderSession();
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const ref = useDismissable(open, close);

  if (!userId) {
    return (
      <Button asChild variant="pill-ghost" size="pill" className="hidden sm:inline-flex">
        <Link to="/auth" search={{ next: undefined }}>
          {t("common.nav.memberLogin")}
        </Link>
      </Button>
    );
  }

  return (
    <div ref={ref} className="relative hidden sm:block">
      <Button
        type="button"
        variant="pill-ghost"
        size="pill"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("common.nav.accountMenu")}
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        <User className="h-3.5 w-3.5" aria-hidden="true" />
        {t("common.nav.myAccount")}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </Button>
      {open && (
        <div
          className={
            "absolute right-0 z-50 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-border/70 bg-card py-1 " +
            CARD_SHADOW
          }
        >
          <MenuRow asChild>
            <Link to="/my-profile" onClick={close}>
              {t("common.nav.myProfile")}
            </Link>
          </MenuRow>
          {roles.isEditor && (
            <MenuRow asChild>
              <Link to="/articles" onClick={close}>
                {t("common.nav.insightsCms")}
              </Link>
            </MenuRow>
          )}
          <MenuRow onClick={() => void signOutHere()}>{t("common.nav.signOut")}</MenuRow>
        </div>
      )}
    </div>
  );
}

export function SiteHeaderBar({
  compact = false,
  standalone = true,
}: {
  compact?: boolean;
  /**
   * `false` when the bar is nested inside a page-owned Deep Blue band (see
   * `CompactHero`). On its own — a token page, a standalone form — it must draw
   * its own band, or the negative lockup lands on the bone background.
   */
  standalone?: boolean;
}) {
  const { t } = useI18n();
  return (
    <SiteHeader
      standalone={standalone}
      variant={compact ? "compact" : "hero"}
      className={compact ? "mb-0" : "mb-10"}
      linkComponent={localeLinkComponent}
      items={navItems.map((i) => ({ to: i.to, label: t(`common.nav.${i.key}`) }))}
      cta={{ to: "/find-a-coach", label: t("common.nav.findACoach") }}
      navLabel={t("common.nav.primaryLabel")}
      brandLabel={t("common.nav.homeAria")}
      skipToContentLabel={t("common.nav.skipToContent")}
      openMenuLabel={t("common.nav.menuOpen")}
      closeMenuLabel={t("common.nav.menuClose")}
      utilitySlot={
        <>
          <LanguageSwitcher />
          <AccountControl />
        </>
      }
      mobileSlot={(close) => <MobileAccountLinks onNavigate={close} />}
    />
  );
}

export function CompactHero({
  eyebrow,
  title,
  lede,
  ctaLabel,
  ctaHref = "#",
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <header className="bg-hero text-hero-foreground">
      <div className="mx-auto max-w-7xl px-5 pt-6 pb-20 sm:px-8">
        <SiteHeaderBar compact standalone={false} />
        <div className="mt-14 max-w-3xl">
          <p className="eyebrow !text-accent">{eyebrow}</p>
          <h1 className="display-xl mt-4">{title}</h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-hero-foreground/85">
            {lede}
          </p>
          {ctaLabel && (
            <div className="mt-9">
              <Button asChild variant="pill" size="pill">
                <a href={ctaHref}>{ctaLabel} →</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
