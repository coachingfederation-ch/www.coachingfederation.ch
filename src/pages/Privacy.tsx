/**
 * Privacy policy page detailing data processing, rights, and third-party services.
 * Exports: PrivacyPage (default). Rendered by src/routes/privacy.tsx and
 * the locale-prefixed equivalent in src/routes/$locale/privacy.tsx.
 *
 * English (src/pages/privacy/*.tsx) is the master text. DE / FR / IT are full
 * translations under src/pages/privacy/{de,fr,it}/ with the same structure;
 * the body is chosen by the current URL locale.
 */
import { useLocale } from "@/i18n";
import { LegalPageShell } from "./LegalPageShell";
import { LegalNoticeSection } from "./privacy/LegalNotice";
import { ImprintSection } from "./privacy/Imprint";
import { ControllerSection } from "./privacy/Controller";
import { DataProcessingSection } from "./privacy/DataProcessing";
import { PurposesSection } from "./privacy/Purposes";
import { ThirdPartiesSection } from "./privacy/ThirdParties";
import { DataTransfersSection } from "./privacy/DataTransfers";
import { RetentionSection } from "./privacy/Retention";
import { CookiesSection } from "./privacy/Cookies";
import { RightsSection } from "./privacy/Rights";
import { MiscSection } from "./privacy/Misc";
import { PrivacyContentDe } from "./privacy/de";
import { PrivacyContentFr } from "./privacy/fr";
import { PrivacyContentIt } from "./privacy/it";

function PrivacyContentEn() {
  return (
    <div className="space-y-12">
      <LegalNoticeSection />

      <hr className="border-border/70" />

      <ImprintSection />

      <hr className="border-border/70" />

      <section className="space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">Privacy Policy</h2>

        <ControllerSection />
        <DataProcessingSection />
        <PurposesSection />
        <ThirdPartiesSection />
        <DataTransfersSection />
        <RetentionSection />
        <CookiesSection />
        <RightsSection />
        <MiscSection />
      </section>
    </div>
  );
}

export default function PrivacyPage() {
  const locale = useLocale();
  return (
    <LegalPageShell pageKey="privacy">
      {locale === "de" ? (
        <PrivacyContentDe />
      ) : locale === "fr" ? (
        <PrivacyContentFr />
      ) : locale === "it" ? (
        <PrivacyContentIt />
      ) : (
        <PrivacyContentEn />
      )}
    </LegalPageShell>
  );
}
