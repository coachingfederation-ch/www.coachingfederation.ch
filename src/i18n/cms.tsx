/**
 * CMS-specific i18n hook and state management for interface language.
 * Exports: setCmsLocale, useCms. Called by CMS-related staff routes.
 */
import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { makeT } from "./index";

const STORAGE_KEY = "icfs-cms-locale";

let current: Locale = DEFAULT_LOCALE;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    current = read();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCmsLocale(locale: Locale) {
  current = locale;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, locale);
  listeners.forEach((l) => l());
}

/** Interface language for the CMS (independent of the public site's URL locale). */
export function useCms() {
  const locale = useSyncExternalStore(
    subscribe,
    () => current,
    () => DEFAULT_LOCALE,
  );
  const { t, tList } = makeT(locale);
  return {
    locale,
    setLocale: setCmsLocale,
    t: (key: string) => t(`cms.${key}`),
    tList: <T = Record<string, string>,>(key: string) => tList<T>(`cms.${key}`),
  };
}
