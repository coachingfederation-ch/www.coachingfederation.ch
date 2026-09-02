"use client";

/**
 * "Propose an event" on /events: a coaching conversation instead of a mailto.
 *
 * The band shows a call to action; the conversation opens in an overlay shared
 * with the contact conversation on /about. The assistant helps the visitor
 * sharpen the idea — what it is, what people take away, the format and the
 * audience — then drafts a proposal they review and confirm from their inbox.
 *
 * Exports: EventProposalAgent. Rendered by src/pages/Events.tsx.
 */
import { Lightbulb } from "lucide-react";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { EnquiryAgentDialog } from "@/components/enquiry/EnquiryAgentDialog";
import { useI18n } from "@/i18n";

export function EventProposalAgent() {
  const { t } = useI18n();

  return (
    <EnquiryAgentDialog
      api="/api/event-proposal-agent"
      kind="event_proposal"
      idPrefix="event-proposal"
      tp={(key) => t(`events.propose.${key}`)}
      suggestionKeys={["workshop", "community", "unsure"]}
      trigger={
        <Button type="button" variant="inverse" size="pill">
          <Lightbulb aria-hidden="true" />
          {t("events.propose.openCta")}
        </Button>
      }
    />
  );
}
