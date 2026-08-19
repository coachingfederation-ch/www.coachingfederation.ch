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
  SiteHeader,
  type SiteLinkComponent,
} from "@/design-system/icf-welcome-design-system-a835df";
import { LocaleLink, useI18n } from "@/i18n";
import {
  CARD_SHADOW,
  MENU_ITEM,
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
      <Button asChild variant="pill-ghost" size="pill" className="hidden text-white sm:inline-flex">
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
        className="gap-1.5 text-white"
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
          <Link to="/my-profile" onClick={close} className={MENU_ITEM}>
            {t("common.nav.myProfile")}
          </Link>
          {roles.isEditor && (
            <Link to="/articles" onClick={close} className={MENU_ITEM}>
              {t("common.nav.insightsCms")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => void signOutHere()}
            className={MENU_ITEM + " w-full"}
          >
            {t("common.nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteHeaderBar({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <SiteHeader
      standalone={false}
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
        <SiteHeaderBar compact />
        <div className="mt-14 max-w-3xl">
          <p className="eyebrow !text-accent">{eyebrow}</p>
          <h1 className="display-xl mt-4">{title}</h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-hero-foreground/85">{lede}</p>
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
