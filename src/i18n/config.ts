/**
 * Shared configuration for locales, path localization, and site URL.
 * Exports: LOCALES, Locale, DEFAULT_LOCALE, localizePath, parseLocalePath. Shared utility.
 */
export const LOCALES = ["en", "de", "fr", "it"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  de: "DE",
  fr: "FR",
  it: "IT",
};

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: "en",
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
};

/** Display order for the language switcher. */
export const LOCALE_ORDER: Locale[] = ["de", "fr", "it", "en"];

/**
 * Canonical public origin. Environment-driven so the migration window
 * (`new.`) and the final apex need no code change — set `VITE_SITE_URL`.
 * Feeds the sitemap, canonical/hreflang/og:url and every claim link.
 */
export const SITE_URL = (
  import.meta.env?.VITE_SITE_URL || "https://new.coachingfederation.ch"
).replace(/\/$/, "");

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Canonical (English) path -> localized path. */
export function localizePath(path: string, locale: Locale) {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean === "" ? "/" : clean;
  return `/${locale}${clean}`;
}

/** Localized path -> { locale, canonical path }. */
export function parseLocalePath(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split("/");
  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    const path = `/${rest.join("/")}`.replace(/\/$/, "");
    return { locale: first, path: path === "" ? "/" : path };
  }
  const path = pathname.replace(/\/$/, "");
  return { locale: DEFAULT_LOCALE, path: path === "" ? "/" : path };
}
