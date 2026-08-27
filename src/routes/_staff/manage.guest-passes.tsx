/**
 * Membership & Engagement guest pass dashboard (/_staff/manage/guest-passes).
 * Exports: Route.
 *
 * The list is fetched in the component rather than the loader: the read is a
 * protected server function, and the staff shell is client-gated anyway.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { GuestPassesDashboard } from "@/components/manage/GuestPassesDashboard";
import { requireStaffAccess, MEMBERSHIP_ROLES } from "@/lib/staff-guard";
import { listAllGuestPasses, type StaffGuestPass } from "@/lib/guest-passes.functions";

export const Route = createFileRoute("/_staff/manage/guest-passes")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, MEMBERSHIP_ROLES),
  head: () => ({
    meta: [
      { title: "Guest passes — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content:
          "Approve guest passes, create complimentary seats and track the guest pass pilot.",
      },
      { property: "og:title", content: "Guest passes — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content:
          "Approve guest passes, create complimentary seats and track the guest pass pilot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuestPassesPage,
});

function GuestPassesPage() {
  const [rows, setRows] = useState<StaffGuestPass[] | null>(null);

  useEffect(() => {
    let active = true;
    listAllGuestPasses()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch(() => {
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        {rows === null ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <GuestPassesDashboard initialRows={rows} />
        )}
      </div>
    </Shell>
  );
}
