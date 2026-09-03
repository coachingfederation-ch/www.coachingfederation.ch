"use client";

/**
 * Fires once when a reader looks like they are leaving the page: the pointer
 * exits through the top edge (desktop), a back navigation is attempted, or the
 * tab is hidden and later returned to. Gated on scroll depth so a bounce in the
 * first seconds never triggers it. Never blocks navigation — the back guard
 * pushes a single sentinel history entry and gives it straight back.
 *
 * Exports: useExitIntent.
 */
import { useEffect, useRef } from "react";

export type ExitIntentOptions = {
  /** When false, no listeners are attached. */
  enabled: boolean;
  /** Fraction of the page the reader must have scrolled through (0-1). */
  minScroll?: number;
  onTrigger: () => void;
};

export function useExitIntent({ enabled, minScroll = 0.5, onTrigger }: ExitIntentOptions) {
  const fired = useRef(false);
  const handler = useRef(onTrigger);
  handler.current = onTrigger;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const deepEnough = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return true;
      return window.scrollY / scrollable >= minScroll;
    };

    const trigger = () => {
      if (fired.current || !deepEnough()) return false;
      fired.current = true;
      handler.current();
      return true;
    };

    const onMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget || event.clientY > 0) return;
      trigger();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") trigger();
    };

    // Sentinel entry: a back press pops it, we prompt, and the reader keeps the
    // real history untouched — pressing back again simply leaves.
    let sentinel = false;
    try {
      window.history.pushState({ feedbackExitGuard: true }, "");
      sentinel = true;
    } catch {
      /* history is unavailable in some embedded browsers */
    }

    const onPopState = () => {
      sentinel = false;
      trigger();
    };

    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("popstate", onPopState);
      if (sentinel) {
        try {
          window.history.back();
        } catch {
          /* nothing to unwind */
        }
      }
    };
  }, [enabled, minScroll]);
}
