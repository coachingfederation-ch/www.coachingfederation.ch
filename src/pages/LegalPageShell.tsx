/**
 * Common layout shell for legal pages.
 * Exports: LegalPageShell. Used as a wrapper by src/pages/Imprint.tsx
 * and src/pages/Privacy.tsx.
 */
import * as React from "react";
import { CompactHero, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/i18n";

interface LegalPageShellProps {
  pageKey: "imprint" | "privacy";
  children: React.ReactNode;
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
      <main id="main" className="pb-24">
        <article className="mx-auto max-w-3xl px-5 pt-16 sm:px-8">{children}</article>
      </main>
      <SiteFooter />
    </div>
  );
}
