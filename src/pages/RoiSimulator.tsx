/**
 * Coaching ROI Simulator page (hidden: no links, not in sitemap, noindex).
 * Rendered by src/routes/for-organisations_.roi-simulator.tsx and its locale twin.
 */
import { CompactHero, SiteFooter } from "@/components/site-chrome";
import { RoiSimulator } from "@/components/organisations/roi/RoiSimulator";
import { useI18n } from "@/i18n";

export default function RoiSimulatorPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero eyebrow={t("roi.hero.eyebrow")} title={t("roi.hero.title")} lede={t("roi.hero.lede")} />
      <main id="main" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <RoiSimulator />
      </main>
      <SiteFooter />
    </div>
  );
}
