/**
 * Common layout shell for legal pages, with a draft banner on Privacy only.
 * Exports: LegalPageShell, DraftBanner. Used as a wrapper by src/pages/Imprint.tsx
 * and src/pages/Privacy.tsx.
 */
import * as React from "react";
import { CompactHero, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/i18n";

interface LegalPageShellProps {
  pageKey: "imprint" | "privacy";
  children: React.ReactNode;
}

export function DraftBanner() {
  const { t } = useI18n();
  return (
    <aside aria-label="Draft notice" className="border-y border-warn/20 bg-warn-soft">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-5 py-4 sm:px-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mt-0.5 h-5 w-5 shrink-0 text-warn-foreground"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-warn-foreground">
            {t("legal.draftBanner.title")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">
            {t("legal.draftBanner.body")}
          </p>
        </div>
      </div>
    </aside>
  );
}

export function LegalPageShell({ pageKey, children }: LegalPageShellProps) {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t(`legal.${pageKey}.hero.eyebrow`)}
        title={t(`legal.${pageKey}.hero.title`)}
        lede={t(`legal.${pageKey}.hero.lede`)}
      />
      {pageKey === "privacy" && <DraftBanner />}
      <main id="main" className="pb-24">
        <article className="mx-auto max-w-3xl px-5 pt-16 sm:px-8">{children}</article>
      </main>
      <SiteFooter />
    </div>
  );
}
