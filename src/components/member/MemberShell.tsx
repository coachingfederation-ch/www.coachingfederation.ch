/**
 * Member Area chrome.
 *
 * The bar is the design system's `SiteHeader` — the same shell the public site
 * uses — so a member moving between the two never changes visual language.
 * Only the content differs: the nav lists the member's own destinations, and
 * the single accent pill leads back to the public Coach Finder.
 *
 * The language control is member-local on purpose: the Member Area is not
 * locale-prefixed, so it switches the CMS interface locale rather than
 * navigating to a translated URL like the public switcher does.
 *
 * The staff link is shown when the account also holds a staff grant — that
 * account genuinely works in both places, and without a way across it would
 * have to sign out and back in to find the CMS. The target follows the
 * account's ACTUAL capability: an organizer-only member is redirected away
 * from /articles by the route guards, so they get /manage/events instead.
 */
import * as React from "react";
import type { ReactNode } from "react";
import { ChevronDown, Globe, LogOut, FileText, CalendarDays } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/design-system/icf-welcome-design-system-a835df";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { LOCALE_LABELS, LOCALE_ORDER } from "@/i18n/config";
import { CARD_SHADOW, useDismissable } from "@/components/chrome/constants";
import { useMyRoles } from "@/lib/roles";
import { hasExactRole } from "@/lib/role-model";

const UTILITY_PILL =
  "inline-flex h-10 items-center gap-1.5 rounded-full border border-white/25 px-3 text-[11px] font-semibold uppercase tracking-wider text-white transition hover:border-white/60 hover:bg-white/10";

/** Interface language for the Member Area — no URL change, unlike the public switcher. */
function MemberLanguageMenu() {
  const { t, locale, setLocale } = useCms();
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const ref = useDismissable(open, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.language")}
        onClick={() => setOpen((v) => !v)}
        className={UTILITY_PILL}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden />
        {LOCALE_LABELS[locale]}
        <ChevronDown className="h-3 w-3" aria-hidden />
      </button>
      {open ? (
        <ul
          aria-label={t("nav.language")}
          className={
            "absolute right-0 z-50 mt-2 min-w-[6rem] overflow-hidden rounded-xl border border-border/70 bg-card py-1 " +
            CARD_SHADOW
          }
        >
          {LOCALE_ORDER.map((l) => (
            <li key={l}>
              <button
                type="button"
                aria-current={l === locale ? "true" : undefined}
                onClick={() => {
                  setLocale(l);
                  close();
                }}
                className={
                  "block min-h-11 w-full px-4 py-3 text-left text-[11px] font-semibold uppercase leading-5 tracking-wider hover:bg-muted hover:text-foreground " +
                  (l === locale ? "bg-muted text-foreground" : "text-foreground/80")
                }
              >
                {LOCALE_LABELS[l]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function MemberShell({ children }: { children: ReactNode }) {
  const { t } = useCms();
  const { roles } = useMyRoles();

  // Exact grants, not the inherited `isEditor` / `isOrganizer` flags: the CMS
  // route guards use exact checks too, so the link must agree with them.
  const organizerOnly =
    hasExactRole(roles.roles, "organizer") &&
    !hasExactRole(roles.roles, "editor") &&
    !roles.isAdmin;
  const staffLink = organizerOnly
    ? ({ to: "/manage/events", key: "nav.events", Icon: CalendarDays } as const)
    : ({ to: "/articles", key: "nav.insightsCms", Icon: FileText } as const);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const items = [
    { to: "/member", label: t("member.nav.home") },
    { to: "/my-profile", label: t("member.nav.profile") },
    { to: "/member/certificates", label: t("member.nav.credits") },
    { to: "/volunteering", label: t("member.nav.volunteering") },
    { to: "/guides", label: t("nav.guides") },
  ];

  const signOutButton = (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      aria-label={t("nav.signOut")}
      title={t("nav.signOut")}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition hover:border-white/60 hover:bg-white/10"
    >
      <LogOut className="h-4 w-4" aria-hidden />
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        variant="compact"
        homeTo="/member"
        items={items}
        cta={{ to: "/find-a-coach", label: t("member.nav.findACoach") }}
        navLabel={t("member.nav.primaryLabel")}
        brandLabel={t("member.nav.homeAria")}
        skipToContentLabel={t("member.nav.skipToContent")}
        openMenuLabel={t("member.nav.menuOpen")}
        closeMenuLabel={t("member.nav.menuClose")}
        utilitySlot={
          <>
            <MemberLanguageMenu />
            {roles.isStaff ? (
              <Link to={staffLink.to} className={`hidden sm:inline-flex ${UTILITY_PILL}`}>
                <staffLink.Icon className="h-3.5 w-3.5" aria-hidden />
                {t(staffLink.key)}
              </Link>
            ) : null}
            {signOutButton}
          </>
        }
        mobileSlot={(close) =>
          roles.isStaff ? (
            <Link
              to={staffLink.to}
              onClick={close}
              className="rounded-full px-4 py-3 text-[13px] font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              {t(staffLink.key)}
            </Link>
          ) : null
        }
      />
      <main id="main">{children}</main>
    </div>
  );
}
