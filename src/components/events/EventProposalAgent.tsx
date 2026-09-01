"use client";

/**
 * "Propose an event" on /events: a coaching conversation instead of a mailto.
 *
 * The assistant helps the visitor sharpen the idea — what it is, what people
 * take away, the format and the audience — then drafts a proposal they review
 * and confirm from their own inbox. The panel is the one shared with the
 * contact conversation on /about.
 *
 * Exports: EventProposalAgent. Rendered by src/pages/Events.tsx.
 */
import { EnquiryAgentPanel } from "@/components/enquiry/EnquiryAgentPanel";
import { useI18n } from "@/i18n";

export function EventProposalAgent() {
  const { t } = useI18n();

  return (
    <EnquiryAgentPanel
      className="mx-auto mt-10 max-w-2xl"
      api="/api/event-proposal-agent"
      kind="event_proposal"
      idPrefix="proposal"
      tp={(key) => t(`events.propose.${key}`)}
      suggestionKeys={["workshop", "community", "unsure"]}
    />
  );
}
