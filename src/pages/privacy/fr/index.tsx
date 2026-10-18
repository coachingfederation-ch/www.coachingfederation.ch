import { LegalNoticeSection } from "./LegalNotice";
import { ImprintSection } from "./Imprint";
import { ControllerSection } from "./Controller";
import { DataProcessingSection } from "./DataProcessing";
import { PurposesSection } from "./Purposes";
import { ThirdPartiesSection } from "./ThirdParties";
import { DataTransfersSection } from "./DataTransfers";
import { RetentionSection } from "./Retention";
import { CookiesSection } from "./Cookies";
import { RightsSection } from "./Rights";
import { MiscSection } from "./Misc";

export function PrivacyContentFr() {
  return (
    <div className="space-y-12">
      <LegalNoticeSection />

      <hr className="border-border/70" />

      <ImprintSection />

      <hr className="border-border/70" />

      <section className="space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">Politique de confidentialité</h2>

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
