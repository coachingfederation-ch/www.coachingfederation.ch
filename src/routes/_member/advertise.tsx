/**
 * Member Area route for "Advertise with us" (/advertise).
 * Exports: Route. Renders the placement configurator inside the member shell.
 */
import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { MemberShell } from "@/components/member/MemberShell";
import { AdvertiseWizard } from "@/components/member/AdvertiseWizard";

export const Route = createFileRoute("/_member/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise with us — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdvertisePage,
  errorComponent: AdvertiseError,
});

function AdvertisePage() {
  return (
    <MemberShell>
      <AdvertiseWizard />
    </MemberShell>
  );
}

/**
 * The advertising tables are created when this draft is accepted, so before
 * that the data calls fail. Catch it here so the member area shows a message
 * instead of a blank screen.
 */
function AdvertiseError({ error }: ErrorComponentProps) {
  return (
    <MemberShell>
      <div className="rounded-3xl border border-border bg-card p-8">
        <h1 className="font-heading text-2xl text-foreground">Advertising is not available yet</h1>
        <p className="mt-3 text-muted-foreground">
          This section becomes available once the advertising setup is live. Please try again later.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">{error.message}</p>
      </div>
    </MemberShell>
  );
}
