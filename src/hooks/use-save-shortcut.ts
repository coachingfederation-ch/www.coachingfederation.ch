/**
 * Cmd/Ctrl+S saves the current CMS editor.
 *
 * The browser's own "Save page" dialog is always suppressed while the hook is
 * mounted, even when `disabled` is set, so the shortcut never surprises an
 * editor mid-typing. The handler is held in a ref so callers don't have to
 * memoise it.
 */
import { useEffect, useRef } from "react";

export function useSaveShortcut(handler: () => void | Promise<void>, disabled = false) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (disabledRef.current) return;
      void handlerRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
