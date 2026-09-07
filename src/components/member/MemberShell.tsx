/**
 * Member Area chrome — deliberately minimal and self-contained.
 *
 * No CMS sidebar: a member's surface is their own directory profile. The one
 * exception is the staff link shown when the account also holds a staff grant
 * — that account genuinely works in both places, and without a way across it
 * would have to sign out and back in to find the CMS. The target follows the
 * account's ACTUAL capability: an organizer-only member is redirected away
 * from /articles by the route guards, so they get /manage/events instead.
 */
import type { ReactNode } from "react";
import { LogOut, FileText, CalendarDays } from "lucide-react";
import { Link } from "@tanstack/react-router";
import icfLogo from "@/assets/icf-switzerland-charter-chapter.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { LOCALE_LABELS, LOCALE_ORDER } from "@/i18n/config";
import { useMyRoles } from "@/lib/roles";
import { hasExactRole } from "@/lib/role-model";

export function MemberShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useCms();
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Client-side navigation home: keeps the Supabase session intact. */}
            <Link to="/" aria-label="The Switzerland Chapter of ICF">
              <img src={icfLogo.url} alt="The Switzerland Chapter of ICF" className="h-12 w-auto" />
            </Link>
            <Link to="/member" className="text-sm font-semibold hover:underline">
              {t("member.areaTitle")}
            </Link>
            {/* Guidelines live on the public site, so one link works for
                members, volunteers and anyone they share it with. */}
            <Link to="/guides" className="text-sm font-semibold hover:underline">
              {t("nav.guides")}
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {roles.isStaff ? (
              <Link
                to={staffLink.to}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              >
                <staffLink.Icon className="h-3.5 w-3.5" />
                {t(staffLink.key)}
              </Link>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {LOCALE_ORDER.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition " +
                    (l === locale
                      ? "bg-primary-foreground text-primary"
                      : "bg-white/10 text-primary-foreground hover:bg-white/20")
                  }
                >
                  {LOCALE_LABELS[l]}
                </button>
              ))}
            </div>
            <button
              onClick={handleSignOut}
              title={t("nav.signOut")}
              className="rounded-md p-1.5 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
