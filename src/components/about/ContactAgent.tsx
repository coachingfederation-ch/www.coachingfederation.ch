"use client";

/**
 * Contact section of /about: a conversation instead of a form.
 *
 * The section shows the invitation; the conversation itself opens in an
 * overlay (sheet on phones, dialog on desktop) shared with the event proposal
 * on /events — see `src/components/enquiry/EnquiryAgentDialog.tsx`.
 *
 * Exports: ContactAgent. Rendered by src/pages/About.tsx.
 */
import { MessageCircle } from "lucide-react";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { EnquiryAgentDialog } from "@/components/enquiry/EnquiryAgentDialog";
import { useI18n } from "@/i18n";

export function ContactAgent() {
  const { t } = useI18n();

  return (
    <section id="contact" className="bg-card py-24" aria-label={t("about.contact.eyebrow")}>
      <div className="mx-auto max-w-2xl px-8 text-center">
        <p className="eyebrow text-primary">{t("about.contact.eyebrow")}</p>
        <h2 className="mt-3 display-lg">{t("about.contact.title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("about.contact.lede")}</p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <EnquiryAgentDialog
            api="/api/contact-agent"
            kind="contact"
            idPrefix="contact"
            tp={(key) => t(`about.contact.${key}`)}
            suggestionKeys={["coach", "organisation", "membership"]}
            trigger={
              <Button type="button" size="pill">
                <MessageCircle aria-hidden="true" />
                {t("about.contact.openCta")}
              </Button>
            }
          />
          <p className="text-xs leading-snug text-muted-foreground">
            {t("about.contact.disclaimer")}
          </p>
        </div>
      </div>
    </section>
  );
}
