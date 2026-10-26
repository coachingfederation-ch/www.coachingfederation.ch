/**
 * Ethics complaints section for the About page. Complaints are handled by
 * ICF Global's independent ethics process, so this links out to it.
 */
import { ExternalLink } from "lucide-react";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";

const ICF_ETHICS_URL = "https://coachingfederation.org/credentialing/coaching-ethics/";

export function EthicsComplaint() {
  const { t } = useI18n();
  return (
    <section id="ethics" className="bg-card py-24">
      <div className="mx-auto max-w-7xl px-8">
        <p className="eyebrow text-primary">{t("about.ethics.eyebrow")}</p>
        <h2 className="mt-3 max-w-2xl display-lg">{t("about.ethics.title")}</h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {t("about.ethics.body")}
        </p>
        <Button asChild variant="default" size="pill" className="mt-8">
          <a href={ICF_ETHICS_URL} target="_blank" rel="noopener noreferrer">
            {t("about.ethics.cta")}
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </div>
    </section>
  );
}
