/**
 * Navigation sidebar and layout wrapper for the staff CMS workspace.
 * Exports: Shell. Wraps all routes under the /articles and /manage hierarchies.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  FileText,
  CalendarDays,
  LogOut,
  Tags,
  ListTree,
  SlidersHorizontal,
  Users,
  PlugZap,
  ShieldCheck,
  Network,
  Globe2,
  UserCircle,
  MessagesSquare,
  BookOpen,
  Headset,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useCms } from "@/i18n/cms";
import { LOCALE_LABELS, LOCALE_ORDER } from "@/i18n/config";
import { useMyRoles } from "@/lib/roles";
import type { AppRole } from "@/lib/role-model";

/**
 * Staff navigation. `allowedRoles` lists the NON-ADMIN roles that may see an
 * item; admins bypass the list entirely. The roles are matched exactly — the
 * inherited `isEditor` / `isOrganizer` helpers would wrongly show Events to an
 * editor. The real boundary is RLS plus the server-side role checks; this only
 * avoids dead ends.
 */
const PLATFORM_ADMIN: readonly AppRole[] = ["administrator"];

const nav = [
  { to: "/articles", key: "nav.articles", icon: FileText, allowedRoles: ["editor"] },
  { to: "/articles/new", key: "nav.newArticle", icon: PencilLine, allowedRoles: ["editor"] },
  { to: "/articles/categories", key: "nav.categories", icon: Tags, allowedRoles: ["editor"] },
  // Organizers see only this item; the shell itself is open to all staff roles.
  { to: "/manage/events", key: "nav.events", icon: CalendarDays, allowedRoles: ["organizer"] },
  { to: "/vocabularies", key: "nav.vocabularies", icon: ListTree, allowedRoles: PLATFORM_ADMIN },
  {
    to: "/coach-finder",
    key: "nav.coachFinder",
    icon: SlidersHorizontal,
    allowedRoles: PLATFORM_ADMIN,
  },
  { to: "/members", key: "nav.members", icon: Users, allowedRoles: [] },
  { to: "/integration", key: "nav.integration", icon: PlugZap, allowedRoles: [] },
  {
    to: "/operational-structure",
    key: "nav.opsStructure",
    icon: Network,
    allowedRoles: PLATFORM_ADMIN,
  },
  { to: "/manage/europe-pulse", key: "nav.europePulse", icon: Globe2, allowedRoles: PLATFORM_ADMIN },
  {
    to: "/manage/governance",
    key: "nav.governance",
    icon: FileText,
    allowedRoles: PLATFORM_ADMIN,
  },
  {
    to: "/manage/chat-insights",
    key: "nav.chatInsights",
    icon: MessagesSquare,
    allowedRoles: PLATFORM_ADMIN,
  },
  { to: "/manage/knowledge", key: "nav.knowledge", icon: BookOpen, allowedRoles: PLATFORM_ADMIN },
  { to: "/manage/live-chat", key: "nav.liveChat", icon: Headset, allowedRoles: PLATFORM_ADMIN },
  { to: "/roles", key: "nav.roles", icon: ShieldCheck, allowedRoles: [] },
] as const satisfies ReadonlyArray<{
  to: string;
  key: string;
  icon: typeof FileText;
  allowedRoles: readonly AppRole[];
}>;

function Logo({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 100 100" className="h-6 w-6" aria-hidden>
          <path
            d="M63 30a10 10 0 0 1 7 17L45 72l-13 4 4-13 25-25a10 10 0 0 1 2-8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <circle cx="72" cy="74" r="5" fill="var(--teal)" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold leading-tight text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">coachingfederation.ch</div>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string | null>(null);
  const { t, locale, setLocale } = useCms();
  const { roles } = useMyRoles();
  const items = nav.filter(
    (item) => roles.isAdmin || item.allowedRoles.some((r) => roles.roles.includes(r)),
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const initials = (email ?? "??").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-border bg-card">
        <div>
          <Logo title={t("nav.workspace")} />
          <nav className="mt-2 flex flex-col gap-1 px-3">
            {items.map(({ to, key, icon: Icon }) => {
              const active =
                to === "/articles" ? pathname === "/articles" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "bg-secondary font-semibold text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(key)}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div>
          {/* A member who also holds `editor` works in two places: the CMS is an
              addition to their Member Area, so keep the way back visible. */}
          {roles.isMember ? (
            <div className="border-t border-border px-3 py-3">
              <Link
                to="/member"
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <UserCircle className="h-4 w-4" />
                <span>{t("nav.memberArea")}</span>
              </Link>
            </div>
          ) : null}
          <div className="border-t border-border px-5 py-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("nav.language")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LOCALE_ORDER.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition " +
                    (l === locale
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground")
                  }
                >
                  {LOCALE_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border px-5 py-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{email ?? t("nav.signedIn")}</div>
              <div className="truncate text-xs text-muted-foreground">{t("nav.role")}</div>
            </div>
            <button
              onClick={handleSignOut}
              title={t("nav.signOut")}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
