/**
 * Member Area home route (/member).
 * Exports: Route. Renders the private dashboard for authenticated members
 * within the MemberShell layout.
 */

import { createFileRoute } from "@tanstack/react-router";
import { MemberShell } from "@/components/member/MemberShell";
import { MemberHome } from "@/components/member/MemberHome";

export const Route = createFileRoute("/_member/member")({
  head: () => ({
    meta: [
      { title: "Member area — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemberHomePage,
});

function MemberHomePage() {
  return (
    <MemberShell>
      <MemberHome />
    </MemberShell>
  );
}
