/**
 * Common layout shell for legal pages.
 * Exports: LegalPageShell. Used as a wrapper by src/pages/Imprint.tsx
 * and src/pages/Privacy.tsx. The privacy page adds a floating table of
 * contents and an optional plain-language summary.
 */
import * as React from "react";
import { CompactHero, SiteFooter } from "@/components/site-chrome";
import { LegalToc } from "@/components/legal/LegalToc";
import { PlainSummary } from "@/components/legal/PlainSummary";
import { useI18n } from "@/i18n";

interface LegalPageShellProps {
  pageKey: "imprint" | "privacy";
  children: React.ReactNode;
}

export function LegalPageShell({ pageKey, children }: LegalPageShellProps) {
  const { t, locale } = useI18n();
  const articleRef = React.useRef<HTMLElement>(null);
  const withToc = pageKey === "privacy";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t(`legal.${pageKey}.hero.eyebrow`)}
        title={t(`legal.${pageKey}.hero.title`)}
        lede={t(`legal.${pageKey}.hero.lede`)}
      />
      <main id="main" className="pb-24">
        {withToc ? (
          <div className="mx-auto max-w-6xl lg:flex lg:gap-12 lg:px-8">
            <div className="lg:order-2 lg:w-64 lg:shrink-0 lg:pt-16">
              <LegalToc targetRef={articleRef} label={t("legal.toc.label")} contentKey={locale} />
            </div>
            <article
              ref={articleRef}
              className="mx-auto min-w-0 max-w-3xl flex-1 px-5 pt-16 sm:px-8 lg:mx-0 lg:px-0"
            >
              <PlainSummary />
              {children}
            </article>
          </div>
        ) : (
          <article className="mx-auto max-w-3xl px-5 pt-16 sm:px-8">{children}</article>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
