/**
 * Contact confirmation page (/contact/confirm/$token).
 *
 * The visitor lands here from the link in their own inbox. Clicking the link is
 * what actually sends the message to our office, so the page performs the
 * confirmation on mount and reports the outcome — nothing here reveals anything
 * about an address that was never used.
 */
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { SiteFooter, SiteHeaderBar } from "@/components/site-chrome";
import { confirmContactEnquiry } from "@/lib/contact-agent.functions";

export const Route = createFileRoute("/contact/confirm/$token")({
  head: () => {
    const title = "Confirm your message — The Switzerland Chapter of ICF";
    const description = "Confirm the message you prepared so our office receives it.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: ContactConfirmRoute,
});

type State = "working" | "sent" | "already" | "invalid";

function ContactConfirmRoute() {
  const { token } = Route.useParams();
  const [state, setState] = useState<State>("working");
  const [subject, setSubject] = useState("");
  // React 18 double-invokes effects in development; the confirmation is
  // idempotent server-side, but one call keeps the UI honest.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void confirmContactEnquiry({ data: { token } })
      .then((result) => {
        if (result.status === "invalid") {
          setState("invalid");
          return;
        }
        setSubject(result.subject ?? "");
        setState(result.status === "already" ? "already" : "sent");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-24">
        {state === "working" && (
          <p className="text-muted-foreground">Confirming your message…</p>
        )}

        {state === "sent" && (
          <>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Your message is on its way
            </h1>
            <p className="mt-3 text-muted-foreground">
              Thank you for confirming. Our office has received your message
              {subject ? ` about “${subject}”` : ""} and will reply to your email address. We also
              sent you a copy for your records.
            </p>
          </>
        )}

        {state === "already" && (
          <>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              This message was already sent
            </h1>
            <p className="mt-3 text-muted-foreground">
              You confirmed it earlier, so our office already has it. There is nothing else to do —
              we will reply to your email address.
            </p>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              This link is no longer valid
            </h1>
            <p className="mt-3 text-muted-foreground">
              Confirmation links expire after seven days. Start a new conversation on our About
              page, or write to us at office@coachingfederation.ch.
            </p>
          </>
        )}

        {state !== "working" && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="pill">
              <Link to="/">Back to the homepage</Link>
            </Button>
            <Button asChild variant="outline" size="pill">
              <Link to="/about">About the chapter</Link>
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
