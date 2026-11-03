/**
 * Staff idle sign-out.
 *
 * Why: an unattended CMS tab is an open door to member data. After
 * IDLE_LIMIT_MS without input in any staff tab the session is signed out;
 * WARN_BEFORE_MS earlier a warning is shown. Activity is shared across tabs
 * through a localStorage timestamp so a busy tab keeps idle ones alive.
 *
 * Client-enforced only: it does not shorten the server-side token lifetime.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const IDLE_LIMIT_MS = 30 * 60_000;
export const WARN_BEFORE_MS = 2 * 60_000;
const STORAGE_KEY = "staff-last-activity";
const EVENTS = ["mousedown", "keydown", "touchstart", "wheel", "pointermove"] as const;

export type IdlePhase = "active" | "warning" | "expired";

/** Pure threshold logic, exported for tests. */
export function idlePhase(lastActivity: number, now: number): IdlePhase {
  const idle = now - lastActivity;
  if (idle >= IDLE_LIMIT_MS) return "expired";
  if (idle >= IDLE_LIMIT_MS - WARN_BEFORE_MS) return "warning";
  return "active";
}

function readShared(fallback: number): number {
  try {
    const v = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(v) && v > 0 ? Math.max(v, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function useIdleSignOut(onExpire: () => void) {
  const [phase, setPhase] = useState<IdlePhase>("active");
  const last = useRef(Date.now());
  const lastWrite = useRef(0);
  const expired = useRef(false);

  const touch = useCallback(() => {
    const now = Date.now();
    last.current = now;
    // Throttle storage writes; pointermove fires constantly.
    if (now - lastWrite.current > 5000) {
      lastWrite.current = now;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        /* storage unavailable: per-tab tracking still works */
      }
    }
  }, []);

  const stay = useCallback(() => {
    lastWrite.current = 0;
    touch();
    setPhase("active");
  }, [touch]);

  useEffect(() => {
    touch();
    const onActivity = () => {
      // While the warning is open only the explicit button resets the timer.
      if (phase === "active") touch();
    };
    for (const e of EVENTS) window.addEventListener(e, onActivity, { passive: true });
    const tick = () => {
      last.current = readShared(last.current);
      const next = idlePhase(last.current, Date.now());
      setPhase(next);
      if (next === "expired" && !expired.current) {
        expired.current = true;
        onExpire();
      }
    };
    const id = window.setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, onActivity);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [onExpire, phase, touch]);

  return { phase, stay };
}
