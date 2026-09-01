"use client";

/**
 * Contact section of /about: a conversation instead of a form.
 *
 * The panel itself is shared with the event proposal on /events — see
 * `src/components/enquiry/EnquiryAgentPanel.tsx`. This file only supplies the
 * section chrome, the endpoint and the copy for the contact flow.
 *
 * Exports: ContactAgent. Rendered by src/pages/About.tsx.
 */
import { EnquiryAgentPanel } from "@/components/enquiry/EnquiryAgentPanel";
import { useI18n } from "@/i18n";

export function ContactAgent() {
  const { t } = useI18n();

  return (
    <section id="contact" className="bg-card py-24" aria-label={t("about.contact.eyebrow")}>
      <div className="mx-auto max-w-7xl px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-primary">{t("about.contact.eyebrow")}</p>
          <h2 className="mt-3 display-lg">{t("about.contact.title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("about.contact.lede")}</p>
        </div>

        <EnquiryAgentPanel
          className="mx-auto mt-10 max-w-2xl"
          api="/api/contact-agent"
          kind="contact"
          idPrefix="contact"
          tp={(key) => t(`about.contact.${key}`)}
          suggestionKeys={["coach", "organisation", "membership"]}
        />
      </div>
    </section>
  );
}
