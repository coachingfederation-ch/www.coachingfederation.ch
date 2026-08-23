/**
 * Shared tokens and small hooks used by the site header/footer chrome pieces.
 * Kept separate so LanguageSwitcher, Header, MobileMenu and Footer can share
 * them without circular imports.
 */
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export const navItems = [
  { key: "home", to: "/" },
  { key: "about", to: "/about" },
  { key: "forCoaches", to: "/for-coaches" },
  { key: "forOrganisations", to: "/for-organisations" },
  { key: "insights", to: "/insights" },
  { key: "events", to: "/events" },
] as const;

export const CARD_SHADOW = "shadow-soft";


export function setStoredLocale(l: string) {
  try {
    window.localStorage.setItem("icf-locale", l);
  } catch {
    /* ignore */
  }
}

export async function signOutHere() {
  await supabase.auth.signOut();
  window.location.reload();
}

/** Shared dropdown primitive: outside-click + Escape close. */
export function useDismissable(open: boolean, close: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { myRolesQueryOptions, EMPTY_ROLES } from "@/lib/roles";

/**
 * Header-local session state. The header renders during SSR, so the signed-out
 * shape is what hydrates; the client query then resolves the real state and the
 * shared `onAuthStateChange` invalidation keeps it honest after sign-in/out.
 */
export function useHeaderSession() {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: 5 * 60_000,
  });
  const userId = session.data ?? null;
  const roles = useQuery({ ...myRolesQueryOptions(userId), enabled: session.isSuccess });

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: ["auth-user-id"] });
      void queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  return { userId, roles: roles.data ?? EMPTY_ROLES };
}
