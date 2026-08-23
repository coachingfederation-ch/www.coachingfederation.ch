/**
 * Guided event creation. The wizard asks the branching questions first and
 * writes the row once, at the end; the full editor takes over afterwards.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { Shell } from "@/components/cms/Shell";
import { EventWizard } from "@/components/cms/event-wizard/EventWizard";
import { useCms } from "@/i18n/cms";

export const Route = createFileRoute("/_staff/manage/events/new")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "New event — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content: "Create a new chapter event in a few guided steps.",
      },
      { property: "og:title", content: "New event — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content: "Create a new chapter event in a few guided steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewEventPage,
});

function NewEventPage() {
  const { t } = useCms();
  return (
    <Shell>
      <EventWizard t={t} />
    </Shell>
  );
}
