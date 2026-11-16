/**
 * Staff idle sign-out.
 *
 * Why: an unattended CMS tab is an open door to member data. After
 * IDLE_LIMIT_MS without input in any staff tab the session is signed out;
 * WARN_BEFORE_MS earlier a warning is shown. Activity is shared across tabs
 * through a localStorage timestamp so a busy tab keeps idle ones alive.
 *
 * Client-enforced only: it does not shorten the server-side token lifetime.
 *
 * The timing rules live in `createIdleTracker` (framework-free, unit-tested).
 * The hook only wires browser events to it and mounts once: an earlier version
 * re-ran its effect on every phase change and reset the timer when the warning
 * opened, so the warning closed itself and sign-out never happened.
 */
import { useEffect, useRef, useState } from "react";

export const IDLE_LIMIT_MS = 30 * 60_000;
export const WARN_BEFORE_MS = 2 * 60_000;
const STORAGE_KEY = "staff-last-activity";
const STORAGE_WRITE_THROTTLE_MS = 5000;
const TICK_MS = 15_000;
const EVENTS = ["mousedown", "keydown", "touchstart", "wheel", "pointermove"] as const;

export type IdlePhase = "active" | "warning" | "expired";

/** Pure threshold logic, exported for tests. */
export function idlePhase(lastActivity: number, now: number): IdlePhase {
  const idle = now - lastActivity;
  if (idle >= IDLE_LIMIT_MS) return "expired";
  if (idle >= IDLE_LIMIT_MS - WARN_BEFORE_MS) return "warning";
  return "active";
}

export interface IdleStore {
  read(): number | null;
  write(value: number): void;
}

export interface IdleTrackerOptions {
  now: () => number;
  store: IdleStore;
  onPhase: (phase: IdlePhase) => void;
  onExpire: () => void;
}

/**
 * Framework-free idle state machine. Only `start()` and `stay()` reset the
 * timer unconditionally; `activity()` is ignored while the warning is open so
 * the explicit "stay signed in" choice is required.
 */
export function createIdleTracker({ now, store, onPhase, onExpire }: IdleTrackerOptions) {
  let last = now();
  let lastWrite = 0;
  let phase: IdlePhase = "active";
  let expired = false;

  const setPhase = (next: IdlePhase) => {
    if (next === phase) return;
    phase = next;
    onPhase(next);
  };

  const touch = (force: boolean) => {
    const t = now();
    last = t;
    if (force || t - lastWrite > STORAGE_WRITE_THROTTLE_MS) {
      lastWrite = t;
      store.write(t);
    }
  };

  return {
    start() {
      touch(true);
    },
    activity() {
      if (phase === "active") touch(false);
    },
    stay() {
      if (expired) return;
      touch(true);
      setPhase("active");
    },
    tick() {
      if (expired) return;
      const shared = store.read();
      if (shared !== null && shared > last) last = shared;
      const next = idlePhase(last, now());
      setPhase(next);
      if (next === "expired") {
        expired = true;
        onExpire();
      }
    },
    get phase() {
      return phase;
    },
  };
}

const browserStore: IdleStore = {
  read() {
    try {
      const v = Number(window.localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch {
      return null;
    }
  },
  write(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* storage unavailable: per-tab tracking still works */
    }
  },
};

export function useIdleSignOut(onExpire: () => void) {
  const [phase, setPhase] = useState<IdlePhase>("active");
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const trackerRef = useRef<ReturnType<typeof createIdleTracker> | null>(null);

  // Mount once: the tracker owns the phase, so React re-renders never reset it.
  useEffect(() => {
    const tracker = createIdleTracker({
      now: Date.now,
      store: browserStore,
      onPhase: setPhase,
      onExpire: () => onExpireRef.current(),
    });
    trackerRef.current = tracker;
    tracker.start();
    const onActivity = () => tracker.activity();
    const tick = () => tracker.tick();
    for (const e of EVENTS) window.addEventListener(e, onActivity, { passive: true });
    const id = window.setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, onActivity);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      trackerRef.current = null;
    };
  }, []);

  const stay = () => trackerRef.current?.stay();

  return { phase, stay };
}
