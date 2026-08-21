/**
 * Member Volunteering detail route (/volunteering).
 * Exports: Route. Renders the volunteering explainer within the MemberShell.
 */

import { createFileRoute } from "@tanstack/react-router";
import { MemberShell } from "@/components/member/MemberShell";
import { VolunteeringPage } from "@/components/member/VolunteeringPage";

export const Route = createFileRoute("/_member/volunteering")({
  head: () => ({
    meta: [
      { title: "Volunteering — Member area — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VolunteeringRoute,
});

function VolunteeringRoute() {
  return (
    <MemberShell>
      <VolunteeringPage />
    </MemberShell>
  );
}
