/**
 * Member engagement campaigns (/_staff/manage/member-engagement).
 * Exports: Route.
 *
 * Membership & Engagement staff author the lifecycle emails the member sync
 * triggers, and review or release what it detected.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/cms/Shell";
import { MemberEngagementPanel } from "@/components/manage/MemberEngagementPanel";
import { requireStaffAccess, MEMBERSHIP_ROLES } from "@/lib/staff-guard";

const TITLE = "Member engagement — The Switzerland Chapter of ICF CMS";
const DESCRIPTION =
  "Author and review the lifecycle emails triggered by member sync: welcome, credential upgrades and grace period re-engagement.";

export const Route = createFileRoute("/_staff/manage/member-engagement")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, MEMBERSHIP_ROLES),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemberEngagementPage,
});

function MemberEngagementPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <MemberEngagementPanel />
      </div>
    </Shell>
  );
}
