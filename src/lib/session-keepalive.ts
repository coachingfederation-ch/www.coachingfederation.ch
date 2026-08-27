/**
 * Keeps the stored Supabase session alive in the installed volunteer app.
 *
 * The home-screen app is suspended, not closed: while it sleeps the client's
 * refresh timer does not run, so the access token is stale on the next launch
 * and the very first request after resume can fail. Refreshing once whenever
 * the app becomes visible again (or the phone regains connectivity) renews the
 * token before any query runs — this is what keeps an occasional volunteer
 * signed in between shifts.
 *
 * Failures are ignored on purpose: a refresh that cannot reach the server is a
 * network problem, not a sign-out.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Don't hammer the auth server when visibility flips repeatedly. */
const MIN_INTERVAL_MS = 60_000;

/** Proactive renewal while the console stays open. */
const RENEW_INTERVAL_MS = 20 * 60_000;

export function useSessionKeepAlive() {
  useEffect(() => {
    let lastRun = 0;
    let cancelled = false;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRun < MIN_INTERVAL_MS) return;
      lastRun = now;
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (cancelled || !data.session) return;
          return supabase.auth.refreshSession();
        })
        .catch(() => undefined);
    };

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    // A console left open all shift also renews on a timer: the access token
    // lives an hour, so a proactive refresh well inside that window keeps the
    // stored session fresh even without a visibility change.
    const timer = window.setInterval(refresh, RENEW_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);
}
