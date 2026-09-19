/**
 * Member Area credits dashboard (/member/certificates).
 * Exports: Route. Shows the signed-in member's earned continuing-education
 * credits per renewal cycle, with their certificates linked for reprinting.
 *
 * The address keeps its original name so existing links and emails that point
 * at the certificates page still land here.
 */
import { createFileRoute } from "@tanstack/react-router";
import { MemberShell } from "@/components/member/MemberShell";
import { CreditsDashboard } from "@/components/member/CreditsDashboard";

export const Route = createFileRoute("/_member/member/certificates")({
  head: () => ({
    meta: [
      { title: "Your credits — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemberCertificatesPage,
});

function MemberCertificatesPage() {
  return (
    <MemberShell>
      <CreditsDashboard />
    </MemberShell>
  );
}
