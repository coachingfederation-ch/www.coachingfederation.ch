/**
 * Member Area home route (/member).
 * Exports: Route. Renders the private dashboard for authenticated members
 * within the MemberShell layout.
 *
 * Lives in `member.index.tsx`, not `member.tsx`: as a leaf it stops being the
 * parent of `/member/certificates`, which otherwise never got an outlet and
 * so could never render.
 */

import { createFileRoute } from "@tanstack/react-router";
import { MemberShell } from "@/components/member/MemberShell";
import { MemberHome } from "@/components/member/MemberHome";

export const Route = createFileRoute("/_member/member/")({
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
