/**
 * Privacy policy page detailing data processing, rights, and third-party services.
 * Exports: PrivacyPage (default). Rendered by src/routes/privacy.tsx and
 * the locale-prefixed equivalent in src/routes/$locale/privacy.tsx.
 */
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

export default function PrivacyPage() {
  return (
    <LegalPageShell pageKey="privacy">
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
    </LegalPageShell>
  );
}
